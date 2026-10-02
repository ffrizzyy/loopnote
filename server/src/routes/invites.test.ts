import request from "supertest";
import { createApp } from "../app";

describe("POST /invites", () => {
  it("generates the requested number of codes", async () => {
    const { app } = createApp();
    const res = await request(app).post("/invites").send({ count: 3 });
    expect(res.status).toBe(201);
    expect(res.body.codes).toHaveLength(3);
  });

  it("defaults to generating one code", async () => {
    const { app } = createApp();
    const res = await request(app).post("/invites").send({});
    expect(res.body.codes).toHaveLength(1);
  });

  it("400s for an out-of-range count", async () => {
    const { app } = createApp();
    const res = await request(app).post("/invites").send({ count: 101 });
    expect(res.status).toBe(400);
  });

  it("400s for a count that isn't an integer, rather than silently generating one code", async () => {
    const { app } = createApp();
    const res = await request(app).post("/invites").send({ count: "5" });
    expect(res.status).toBe(400);
  });
});

describe("POST /invites/redeem", () => {
  it("redeems a valid code and creates a user", async () => {
    const { app, invitesRepo } = createApp();
    const [code] = invitesRepo.generate(1);

    const res = await request(app).post("/invites/redeem").send({ code: code.code, email: "student@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("student@example.com");
  });

  it("is case-insensitive on the code and normalizes email casing", async () => {
    const { app, invitesRepo } = createApp();
    const [code] = invitesRepo.generate(1);

    const res = await request(app)
      .post("/invites/redeem")
      .send({ code: code.code.toLowerCase(), email: "Student@Example.com" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("student@example.com");
  });

  it("409s when the code was already redeemed", async () => {
    const { app, invitesRepo } = createApp();
    const [code] = invitesRepo.generate(1);
    await request(app).post("/invites/redeem").send({ code: code.code, email: "a@example.com" });

    const res = await request(app).post("/invites/redeem").send({ code: code.code, email: "b@example.com" });
    expect(res.status).toBe(409);
  });

  it("404s for a code that doesn't exist", async () => {
    const { app } = createApp();
    const res = await request(app).post("/invites/redeem").send({ code: "NOTREAL1", email: "a@example.com" });
    expect(res.status).toBe(404);
  });

  it("400s for an invalid email", async () => {
    const { app, invitesRepo } = createApp();
    const [code] = invitesRepo.generate(1);
    const res = await request(app).post("/invites/redeem").send({ code: code.code, email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("400s for an absurdly long email without running the email regex on it", async () => {
    const { app, invitesRepo } = createApp();
    const [code] = invitesRepo.generate(1);
    const email = `a@${".".repeat(50_000)}`;
    const res = await request(app).post("/invites/redeem").send({ code: code.code, email });
    expect(res.status).toBe(400);
  });
});
