const axios = require('axios');
const User = require('../../models/User');
const crypto = require('crypto');
const { AuthDataValidator } = require('@telegram-auth/server');
const { objectToAuthDataMap } = require('@telegram-auth/server/utils');
const { saveUserSession } = require('../../services/userSession');
const { generateJwtToken } = require('../../helpers/generateJwt');

class SocialAuthController {

    initAuth(req, res) {
        const state = crypto.randomBytes(32).toString('hex');
        req.session.oauthState = state;
        let scopes = ['profile', 'email'];
        let url = `https://accounts.google.com/o/oauth2/v2/auth?scope=${scopes.join(' ')}&access_type=offline&prompt=consent&include_granted_scopes=true&response_type=code&redirect_uri=${process.env.GOOGLE_REDIRECT_URL}&client_id=${process.env.GOOGLE_CLIENT_ID}&state=${state}`;
        return res.redirect(url);
    }

    linkGoogleAccount(req, res) {
        const state = crypto.randomBytes(32).toString('hex');
        req.session.oauthLinkState = state;
        const scopes = ['profile', 'email'];
        const url = `https://accounts.google.com/o/oauth2/v2/auth?scope=${scopes.join(' ')}&access_type=offline&prompt=consent&include_granted_scopes=true&response_type=code&redirect_uri=${process.env.GOOGLE_LINK_REDIRECT_URL}&client_id=${process.env.GOOGLE_CLIENT_ID}&state=${state}`;
        return res.redirect(url);
    }

    async linkGoogleCallback(req, res) {
        const { code, state } = req.query;
        const currentUserId = req.user?.id;

        if (!currentUserId) {
            return res.status(401).json({ error: 'User must be logged in to link Google account.' });
        }

        if (!state || state !== req.session?.oauthLinkState) {
            return res.redirect(`${process.env.FRONTEND_URL}/account-setting?error=${encodeURIComponent('Invalid or expired OAuth state. Please try linking again.')}`);
        }
        delete req.session.oauthLinkState;

        try {
            // Exchange code for token
            const { data } = await axios.post('https://oauth2.googleapis.com/token', null, {
                params: {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    code,
                    redirect_uri: process.env.GOOGLE_LINK_REDIRECT_URL,
                    grant_type: 'authorization_code'
                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = data;

            // Get user profile from Google
            const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const googleId = profile.id;
            const existingWithGoogleId = await User.findOne({ googleId });

            if (existingWithGoogleId) {
                return res.redirect(`${process.env.FRONTEND_URL}/account-setting?error=This Google account is already linked to another user.`);
            }

            // Link Google account
            const user = await User.findById(currentUserId);
            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=User not found. Please log in again.`);
            }
            user.googleId = googleId;
            await user.save();

            return res.redirect(`${process.env.FRONTEND_URL}/account-setting?success=Google account linked`);
        } catch (error) {
            const errorMessage = encodeURIComponent(
                error?.response?.data?.error_description ||
                error?.message ||
                'Google linking failed'
            );
            return res.redirect(`${process.env.FRONTEND_URL}/account-setting?error=${errorMessage}`);
        }
    }

    async unlinkGoogleAccount(req, res) {
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.googleId) {
            return res.status(400).json({
                message: 'No Google account is currently linked to your profile.'
            });
        }
        if (!user.password) {
            return res.status(400).json({ message: 'You must set a password before unlinking your Google account.' });
        }

        user.googleId = null;
        await user.save();
       const loginDetails = await User.findById(user._id)
                .populate("membershipTier")
                .populate("badges.badge")
                .populate({
                    path: 'apiKeys',
                    match: {
                        expiresAt: { $gt: new Date() },
                        deletedAt: null
                    },
                    options: {
                        sort: { createdAt: -1 },
                        limit: 1
                    }
                });
            const latestApiKey = loginDetails.apiKeys.length > 0 ? loginDetails.apiKeys[0].toJSON({ virtuals: true }) : null;
            let rewardPoints = await loginDetails.rewardPoints();

            let userData = await user.getProfileWithSignedURL();
            userData._doc.hasPassword = !!user.password;
            userData._doc.latestApiKey = latestApiKey;
            userData._doc.rewardPoints = rewardPoints;

        return res.status(200).json({ success: true, message: 'Google account unlinked', user: userData });
    }

    async googleCallback(req, res, next) {
        const { code, state } = req.query;

        if (!state || state !== req.session?.oauthState) {
            return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=${encodeURIComponent('Invalid or expired OAuth state. Please try again.')}`);
        }
        delete req.session.oauthState;

        try {
            // Exchange authorization code for access token
            const { data } = await axios({
                method: 'post',
                url: 'https://oauth2.googleapis.com/token',
                params: {
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: process.env.GOOGLE_REDIRECT_URL

                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = data;

            const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            // Check if the user already exists in the database
            let userData = {};
            const googleId = profile.id;
            const existingByGoogle = await User.findOne({ googleId: googleId });
            let user = await User.findOne({ email: profile.email });

            if (existingByGoogle) {
                userData = await existingByGoogle.getProfileWithSignedURL();

                const userSession = await saveUserSession({ req, userId: userData._id, loginType: "Google" });

                const token = generateJwtToken(userData, userSession._id);

                req.session = { jwt: token };
                return res.redirect(`${process.env.FRONTEND_URL}/sign-in?success=Logged in successfully.`);
            }

            // Condition 1: User already exists with Google's OAuth linked
            if (user && user.googleId === googleId) {
                userData = await user.getProfileWithSignedURL();

                const userSession = await saveUserSession({ req, userId: userData._id, loginType: "Google" });

                const userJwt = generateJwtToken(userData, userSession._id);

                req.session = { jwt: userJwt };
                return res.redirect(`${process.env.FRONTEND_URL}/sign-in?success=Logged in successfully.`);
            }


            // Condition 2: User already exists with the same email but Google's OAuth isn't linked
            if (user && !user.googleId) {
                user.googleId = googleId;
                user.isProfileVerified = true;
                await user.save();

                userData = await user.getProfileWithSignedURL();

                const userSession = await saveUserSession({ req, userId: userData._id, loginType: "Google" });

                const userJwt = generateJwtToken(userData, userSession._id);

                req.session = { jwt: userJwt };
                return res.redirect(`${process.env.FRONTEND_URL}/sign-in?success=Logged in successfully.`);
            }
            // Condition 3: User doesn't exist
            if (!user) {
                userData = await User.create({
                    name: profile.name,
                    email: profile.email,
                    googleId: profile.id,
                    isProfileVerified: true
                });

                const userSession = await saveUserSession({ req, userId: userData._id, loginType: "Google" });

                const userJwt = generateJwtToken(userData, userSession._id);

                req.session = { jwt: userJwt };
                return res.redirect(`${process.env.FRONTEND_URL}/sign-in?success=Logged in successfully.`);
            }
        } catch (error) {
            const errorMessage = encodeURIComponent(
                error?.response?.data?.error_description ||
                error?.message ||
                'Google login failed'
            );
            return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=${errorMessage}`);
        }
    }

    async telegramCallback(req, res, next) {
        try {
            const validator = new AuthDataValidator({ botToken: process.env.TELEGRAM_BOT_TOKEN });
            const data = objectToAuthDataMap(req.body);
            const userData = await validator.validate(data);
            let user = await User.findOne({ telegramId: userData.id });
            let userJson = {}
            //console.log(user);
            if (!user) {
                const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(" ");

                userJson = await User.create({
                    name: fullName,
                    telegramId: userData.id,
                    isProfileVerified: true
                });
                userJson = await userJson.getProfileWithSignedURL();
            } else {
                userJson = await user.getProfileWithSignedURL();
            }
            
            const userSession = await saveUserSession({ req, userId: userJson._id, loginType: "Telegram" });

            const userJwt = generateJwtToken(userJson, userSession._id);

            req.session = { jwt: userJwt };
            return res.status(200).json({ data: userJson, token: userJwt, message: 'Logged in successfully', success: true });
        } catch (err) {
            const errorMessage =
                err?.response?.data?.error_description ||
                err?.message ||
                'Telegram login failed';
            return res.status(400).json({ error: errorMessage, success: false });
        }

    }

    async linkTelegramAccount(req, res, next) {
        try {
            const currentUserId = req.user?.id;
            if (!currentUserId) {
                return res.status(401).json({ error: 'User must be logged in to link Telegram account.', success: false });
            }

            const validator = new AuthDataValidator({ botToken: process.env.TELEGRAM_BOT_TOKEN });
            const { reclaim, ...authBody } = req.body;
            const data = objectToAuthDataMap(authBody);
            const userData = await validator.validate(data);
            const telegramId = userData.id;

            const existingWithTelegramId = await User.findOne({ telegramId });
            if (existingWithTelegramId && existingWithTelegramId._id.toString() !== currentUserId) {
                // Allow reclaim: unlink from the other user and link to current user
                if (reclaim === true) {
                    await User.updateOne({ _id: existingWithTelegramId._id }, { $unset: { telegramId: "" } });
                } else {
                    return res.status(400).json({ error: 'This Telegram account is already linked to another user.', success: false });
                }
            }

            const user = await User.findById(currentUserId);
            if (!user) {
                return res.status(404).json({ error: 'User not found. Please log in again.', success: false });
            }

            user.telegramId = telegramId;
            user.isProfileVerified = true;
            await user.save();

            const userDataWithProfile = await user.getProfileWithSignedURL();
            return res.status(200).json({ data: userDataWithProfile, message: 'Telegram account linked successfully', success: true });
        } catch (err) {
            const errorMessage =
                err?.response?.data?.error_description ||
                err?.message ||
                'Telegram linking failed';
            return res.status(400).json({ error: errorMessage, success: false });
        }
    }

    async unlinkTelegramAccount(req, res) {
        const userId = req.user?.id;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.telegramId) {
            return res.status(400).json({
                message: 'No Telegram account is currently linked to your profile.'
            });
        }

        await User.updateOne({ _id: userId }, { $unset: { telegramId: "" } });

        const updatedUser = await User.findById(userId)
            .populate("membershipTier")
            .populate("badges.badge")
            .populate({
                path: 'apiKeys',
                match: {
                    expiresAt: { $gt: new Date() },
                    deletedAt: null
                },
                options: {
                    sort: { createdAt: -1 },
                    limit: 1
                }
            });
        const latestApiKey = updatedUser.apiKeys?.length > 0 ? updatedUser.apiKeys[0].toJSON({ virtuals: true }) : null;
        let rewardPoints = await updatedUser.rewardPoints();

        let userData = await updatedUser.getProfileWithSignedURL();
        userData._doc.hasPassword = !!user.password;
        userData._doc.latestApiKey = latestApiKey;
        userData._doc.rewardPoints = rewardPoints;

        return res.status(200).json({ success: true, message: 'Telegram account unlinked', user: userData });
    }

}

module.exports = new SocialAuthController();