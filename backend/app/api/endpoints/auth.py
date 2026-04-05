from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import JWTError

from app.core.database import get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    create_email_verification_token,
    decode_token,
)
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    TokenResponse,
    UserResponse,
    AuthResponse,
    MessageResponse,
)

router = APIRouter()


def _build_token_response(user_id: str, email: str) -> TokenResponse:
    """Helper to build a token response with both access and refresh tokens."""
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(lambda: None),  # overridden below
) -> User:
    """Extract current user from JWT access token."""
    # This will be replaced by the actual dependency
    pass


# ---- Registration ----


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
@limiter.limit("5/minute")
def register(request: Request, user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user
    new_user = User(
        email=user_in.email.lower(),
        password_hash=hash_password(user_in.password),
        full_name=user_in.full_name,
        is_active=True,
        email_verified=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate tokens
    tokens = _build_token_response(str(new_user.id), new_user.email)

    # TODO: Send verification email (for now, auto-verify or log the token)
    # verification_token = create_email_verification_token(str(new_user.id), new_user.email)
    # print(f"Verification link: {settings.FRONTEND_URL}/verify-email?token={verification_token}")

    return AuthResponse(
        user=UserResponse.model_validate(new_user),
        tokens=tokens,
    )


# ---- Login ----


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email and password",
)
@limiter.limit("10/minute")
def login(request: Request, user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support.",
        )

    tokens = _build_token_response(str(user.id), user.email)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )


# ---- Refresh Token ----


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
@limiter.limit("20/minute")
def refresh_token(
    request: Request, token_in: RefreshTokenRequest, db: Session = Depends(get_db)
):
    try:
        payload = decode_token(token_in.refresh_token, expected_type="refresh")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    return _build_token_response(str(user.id), user.email)


# ---- Get Current User (profile) ----

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency to get the current authenticated user from JWT token."""
    token = credentials.credentials
    try:
        payload = decode_token(token, expected_type="access")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return user


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


# ---- Change Password (authenticated) ----


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password (requires authentication)",
)
@limiter.limit("5/minute")
def change_password(
    request: Request,
    password_in: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(password_in.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if verify_password(password_in.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    current_user.password_hash = hash_password(password_in.new_password)
    db.commit()

    return MessageResponse(message="Password changed successfully")


# ---- Forgot Password ----


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    forgot_in: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == forgot_in.email.lower()).first()

    # Always return success to prevent email enumeration
    if not user:
        return MessageResponse(
            message="If an account exists with this email, a reset link has been sent"
        )

    # Generate reset token
    reset_token = create_password_reset_token(str(user.id), user.email)

    # TODO: Send password reset email
    # For now, log it (in production, integrate with email service like SendGrid, AWS SES, etc.)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    print(f"[PASSWORD RESET] Link for {user.email}: {reset_link}")

    return MessageResponse(
        message="If an account exists with this email, a reset link has been sent"
    )


# ---- Reset Password ----


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using token from email",
)
@limiter.limit("5/minute")
def reset_password(
    request: Request,
    reset_in: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(reset_in.token, expected_type="password_reset")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token",
        )

    user.password_hash = hash_password(reset_in.new_password)
    db.commit()

    return MessageResponse(
        message="Password has been reset successfully. You can now log in."
    )


# ---- Verify Email ----


@router.get(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address using token",
)
@limiter.limit("10/minute")
def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    try:
        payload = decode_token(token, expected_type="email_verification")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token",
        )

    if user.email_verified:
        return MessageResponse(message="Email already verified")

    user.email_verified = True
    db.commit()

    return MessageResponse(message="Email verified successfully")


# ---- Resend Verification Email ----


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend verification email",
)
@limiter.limit("3/minute")
def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    if current_user.email_verified:
        return MessageResponse(message="Email already verified")

    verification_token = create_email_verification_token(
        str(current_user.id), current_user.email
    )
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

    # TODO: Send verification email
    print(f"[EMAIL VERIFY] Link for {current_user.email}: {verify_link}")

    return MessageResponse(message="Verification email has been sent")
