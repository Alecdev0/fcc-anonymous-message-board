const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  this.timeout(10000);

  const board = "test-board";
  const threadPassword = "thread-password";
  const replyPassword = "reply-password";

  let threadId;
  let deleteThreadId;
  let replyId;
  let deleteReplyId;

  test("Creating a new thread: POST request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post(`/api/threads/${board}`)
      .redirects(0)
      .send({
        text: "Functional test thread",
        delete_password: threadPassword
      })
      .end(function (err, res) {
        assert.oneOf(res.status, [200, 302]);
        done();
      });
  });

  test("Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .get(`/api/threads/${board}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);

        const thread = res.body.find(
          (item) => item.text === "Functional test thread"
        );

        assert.exists(thread);
        assert.property(thread, "_id");
        assert.property(thread, "text");
        assert.property(thread, "created_on");
        assert.property(thread, "bumped_on");
        assert.property(thread, "replies");
        assert.property(thread, "replycount");

        assert.notProperty(thread, "delete_password");
        assert.notProperty(thread, "reported");

        assert.isAtMost(thread.replies.length, 3);

        threadId = thread._id;
        done();
      });
  });

  test("Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .delete(`/api/threads/${board}`)
      .send({
        thread_id: threadId,
        delete_password: "wrong-password"
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      });
  });

  test("Deleting a thread with the correct password: DELETE request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .post(`/api/threads/${board}`)
      .redirects(0)
      .send({
        text: "Thread to delete",
        delete_password: threadPassword
      })
      .end(function () {
        chai
          .request(server)
          .get(`/api/threads/${board}`)
          .end(function (err, res) {
            const thread = res.body.find(
              (item) => item.text === "Thread to delete"
            );

            assert.exists(thread);
            deleteThreadId = thread._id;

            chai
              .request(server)
              .delete(`/api/threads/${board}`)
              .send({
                thread_id: deleteThreadId,
                delete_password: threadPassword
              })
              .end(function (err, deleteRes) {
                assert.equal(deleteRes.status, 200);
                assert.equal(deleteRes.text, "success");
                done();
              });
          });
      });
  });

  test("Reporting a thread: PUT request to /api/threads/{board}", function (done) {
    chai
      .request(server)
      .put(`/api/threads/${board}`)
      .send({
        thread_id: threadId
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
        done();
      });
  });

  test("Creating a new reply: POST request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .post(`/api/replies/${board}`)
      .redirects(0)
      .send({
        thread_id: threadId,
        text: "Functional test reply",
        delete_password: replyPassword
      })
      .end(function (err, res) {
        assert.oneOf(res.status, [200, 302]);
        done();
      });
  });

  test("Viewing a single thread with all replies: GET request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .get(`/api/replies/${board}`)
      .query({
        thread_id: threadId
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.body._id, threadId);
        assert.isArray(res.body.replies);

        assert.notProperty(res.body, "delete_password");
        assert.notProperty(res.body, "reported");

        const reply = res.body.replies.find(
          (item) => item.text === "Functional test reply"
        );

        assert.exists(reply);
        assert.property(reply, "_id");
        assert.property(reply, "text");
        assert.property(reply, "created_on");

        assert.notProperty(reply, "delete_password");
        assert.notProperty(reply, "reported");

        replyId = reply._id;
        done();
      });
  });

  test("Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .delete(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId,
        delete_password: "wrong-password"
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "incorrect password");
        done();
      });
  });

  test("Deleting a reply with the correct password: DELETE request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .post(`/api/replies/${board}`)
      .redirects(0)
      .send({
        thread_id: threadId,
        text: "Reply to delete",
        delete_password: replyPassword
      })
      .end(function () {
        chai
          .request(server)
          .get(`/api/replies/${board}`)
          .query({
            thread_id: threadId
          })
          .end(function (err, res) {
            const reply = res.body.replies.find(
              (item) => item.text === "Reply to delete"
            );

            assert.exists(reply);
            deleteReplyId = reply._id;

            chai
              .request(server)
              .delete(`/api/replies/${board}`)
              .send({
                thread_id: threadId,
                reply_id: deleteReplyId,
                delete_password: replyPassword
              })
              .end(function (err, deleteRes) {
                assert.equal(deleteRes.status, 200);
                assert.equal(deleteRes.text, "success");
                done();
              });
          });
      });
  });

  test("Reporting a reply: PUT request to /api/replies/{board}", function (done) {
    chai
      .request(server)
      .put(`/api/replies/${board}`)
      .send({
        thread_id: threadId,
        reply_id: replyId
      })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, "reported");
        done();
      });
  });
});