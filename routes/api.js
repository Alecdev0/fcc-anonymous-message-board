"use strict";

const { Thread } = require("../models");

module.exports = function (app) {
  app
    .route("/api/threads/:board")

    .post(async (req, res) => {
      try {
        const board = req.params.board;
        const { text, delete_password } = req.body;

        const now = new Date();

        await Thread.create({
          board,
          text,
          delete_password,
          created_on: now,
          bumped_on: now,
          reported: false,
          replies: []
        });

        res.redirect(`/b/${board}/`);
      } catch (error) {
        console.error(error);
        res.status(500).send("server error");
      }
    })

    .get(async (req, res) => {
      try {
        const board = req.params.board;

        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 })
          .limit(10)
          .lean();

        const result = threads.map((thread) => {
          const replycount = thread.replies.length;

          const replies = thread.replies
            .sort(
              (a, b) =>
                new Date(b.created_on).getTime() -
                new Date(a.created_on).getTime()
            )
            .slice(0, 3)
            .map((reply) => {
              delete reply.delete_password;
              delete reply.reported;
              return reply;
            });

          delete thread.delete_password;
          delete thread.reported;

          return {
            ...thread,
            replies,
            replycount
          };
        });

        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).send("server error");
      }
    })

    // Delete a thread
    .delete(async (req, res) => {
      try {
        const board = req.params.board;
        const { thread_id, delete_password } = req.body;

        const thread = await Thread.findOne({
          _id: thread_id,
          board: board
        });

        if (!thread) {
          return res.send("incorrect password");
        }

        if (thread.delete_password !== delete_password) {
          return res.send("incorrect password");
        }

        await Thread.deleteOne({
          _id: thread_id,
          board: board
        });

        res.send("success");
      } catch (error) {
        console.error(error);
        res.status(500).send("server error");
      }
    })

    // Report a thread
    .put(async (req, res) => {
      try {
        const board = req.params.board;
        const thread_id = req.body.thread_id || req.body.report_id;

        const thread = await Thread.findOneAndUpdate(
          {
            _id: thread_id,
            board: board
          },
          {
            reported: true
          },
          {
            new: true
          }
        );

        if (!thread) {
          return res.status(404).send("thread not found");
        }

        res.send("reported");
      } catch (error) {
        console.error(error);
        res.status(500).send("server error");
      }
    });

    app
  .route("/api/replies/:board")

  // Create a new reply
  .post(async (req, res) => {
    try {
      const board = req.params.board;
      const { thread_id, text, delete_password } = req.body;

      const now = new Date();

      const thread = await Thread.findOne({
        _id: thread_id,
        board: board
      });

      if (!thread) {
        return res.status(404).send("thread not found");
      }

      thread.replies.push({
        text,
        delete_password,
        created_on: now,
        reported: false
      });

      thread.bumped_on = now;

      await thread.save();

      res.redirect(`/b/${board}/${thread_id}`);
    } catch (error) {
      console.error("Create reply error:", error);
      res.status(500).send("server error");
    }
  })

  // View one thread with all replies
  .get(async (req, res) => {
    try {
      const board = req.params.board;
      const thread_id = req.query.thread_id;

      const thread = await Thread.findOne({
        _id: thread_id,
        board: board
      }).lean();

      if (!thread) {
        return res.status(404).send("thread not found");
      }

      delete thread.delete_password;
      delete thread.reported;

      thread.replies = thread.replies.map((reply) => {
        delete reply.delete_password;
        delete reply.reported;
        return reply;
      });

      res.json(thread);
    } catch (error) {
      console.error("View thread error:", error);
      res.status(500).send("server error");
    }
  })

  // Delete a reply
  .delete(async (req, res) => {
    try {
      const board = req.params.board;
      const { thread_id, reply_id, delete_password } = req.body;

      const thread = await Thread.findOne({
        _id: thread_id,
        board: board
      });

      if (!thread) {
        return res.send("incorrect password");
      }

      const reply = thread.replies.id(reply_id);

      if (!reply || reply.delete_password !== delete_password) {
        return res.send("incorrect password");
      }

      reply.text = "[deleted]";

      await thread.save();

      res.send("success");
    } catch (error) {
      console.error("Delete reply error:", error);
      res.status(500).send("server error");
    }
  })

  // Report a reply
  .put(async (req, res) => {
    try {
      const board = req.params.board;

      const thread_id =
        req.body.thread_id || req.body.threadid;

      const reply_id =
        req.body.reply_id || req.body.report_id;

      const thread = await Thread.findOne({
        _id: thread_id,
        board: board
      });

      if (!thread) {
        return res.status(404).send("thread not found");
      }

      const reply = thread.replies.id(reply_id);

      if (!reply) {
        return res.status(404).send("reply not found");
      }

      reply.reported = true;

      await thread.save();

      res.send("reported");
    } catch (error) {
      console.error("Report reply error:", error);
      res.status(500).send("server error");
    }
  });
};