const UserSession = require("../../models/UserSession");

class SessionController {
  async getAll(req, res, next) {
    try {
      // Get all sessions including the current one, sorted by most recent first
      const sessions = await UserSession.find({
        userId: req.user.id
      }).sort({ currentLogin: -1 });


      const sessionsWithCurrentFlag = sessions.map(session => {
        const sessionObj = session.toJSON();
        sessionObj.isCurrent = session._id.toString() === req?.user?.sessionId?.toString();
        return sessionObj;
      });

      res.json({ sessions: sessionsWithCurrentFlag, success: true });
    } catch (error) {
      next(error);
    }
  }                                                                                                   

  async logoutOne(req, res, next) {
    try {
      await UserSession.deleteOne({ _id: req.params.sessionId });
      res.json({ message: "Session logged out", success: true });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await UserSession.deleteMany({ userId: req.user.id, _id: { $ne: req?.user?.sessionId } });
      res.json({ message: "Logged out from all devices", success: true, sessionId: req?.user?.sessionId });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SessionController();
