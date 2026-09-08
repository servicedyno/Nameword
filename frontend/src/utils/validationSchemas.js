import { parsePhoneNumberFromString } from 'libphonenumber-js';
import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    // .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const registerSchema = Yup.object().shape({
  name: Yup.string().trim().required('Name is required'),
  username: Yup.string().trim().required('Username is required'),
  mobile: Yup.string()
    .trim()
    .required('Mobile field is required.').test('is-valid', 'Enter a valid phone number', function (value) {
      const { phoneCountryCode } = this.parent;
      const phoneNumber = parsePhoneNumberFromString(`+${value || ''}`, phoneCountryCode?.toUpperCase() || 'US');
      return phoneNumber?.isValid() || false;
    }),
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must contain at least 8 characters')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must include at least one special symbol')
    .matches(/[a-z]/, 'Password must include a lowercase letter')
    .matches(/[A-Z]/, 'Password must include an uppercase letter')
    .matches(/[0-9]/, 'Password must include at least one number')
    .required('Password is required'),
  passwordConfirmation: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const resetPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

export const setPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  token: Yup.string()
    .required('Reset token is required'),
  password: Yup.string()
    .min(8, 'Password must contain at least 8 characters')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must include at least one special symbol')
    .matches(/[a-z]/, 'Password must include a lowercase letter')
    .matches(/[A-Z]/, 'Password must include an uppercase letter')
    .matches(/[0-9]/, 'Password must include at least one number')
    .required('Password is required'),
  passwordConfirmation: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});

export const otpSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, 'OTP must be exactly 6 digits')
    .matches(/^\d+$/, 'OTP must contain only numbers')
    .required('OTP is required'),
});

export const accountDetailsSchema = Yup.object().shape({
  name: Yup.string().trim().required('Name is required'),
  username: Yup.string().trim().required('Username is required'),
  mobile: Yup.string()
    .trim()
    .required('Mobile field is required.').test('is-valid', 'Enter a valid phone number', function (value) {
      const { phoneCountryCode } = this.parent;
      const phoneNumber = parsePhoneNumberFromString(`+${value || ''}`, phoneCountryCode?.toUpperCase() || 'US');
      return phoneNumber?.isValid() || false;
    })
});

export const changePassword = Yup.object().shape({
  oldPassword: Yup.string().trim().required("Current password is required."),
  newPassword: Yup.string()
    .min(8, 'New password must contain at least 8 characters')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'New password must include at least one special symbol')
    .matches(/[a-z]/, 'New password must include a lowercase letter')
    .matches(/[A-Z]/, 'New password must include an uppercase letter')
    .matches(/[0-9]/, 'New password must include at least one number')
    .required('New password is required'),
  newPasswordConfirmation: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'New Password and Confirm Password must be the same.')
    .required('Confirm password is required.'),
});

export const accountSettingSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must contain at least 8 characters')
    .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must include at least one special symbol')
    .matches(/[a-z]/, 'Password must include a lowercase letter')
    .matches(/[A-Z]/, 'Password must include an uppercase letter')
    .matches(/[0-9]/, 'Password must include at least one number')
    .required('Password is required'),
});

export const twoFactorSchema = Yup.object().shape({
  token: Yup.string()
    .required("2FA code is required")
    .matches(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export const apiKeySchema = Yup.object().shape({
  keyname: Yup.string().trim().required("Key name is required"),
  expiration: Yup.string().trim().required("Expiration is required"),
});

export const walletTopUpSchema = Yup.object().shape({
  amount: Yup.number().typeError("Amount must be a number").positive("Amount must be greater than 0").required("Amount is required"),
});