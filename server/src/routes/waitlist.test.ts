import request from "supertest";
import { createApp } from "../app";

describe("POST /waitlist", () => {
  it("joins the waitlist", async () => {
    const { app } = createApp();
    const res = await request(app).post("/waitlist").send({ email: "student@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.entry.invited).toBe(false);
  });

  it("400s for an invalid email", async () => {
    const { app } = createApp();
    const res = await request(app).post("/waitlist").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("GET /waitlist", () => {
  it("lists joined entries", async () => {
    const { app } = createApp();
    await request(app).post("/waitlist").send({ email: "a@example.com" });
    await request(app).post("/waitlist").send({ email: "b@example.com" });

    const res = await request(app).get("/waitlist");
    expect(res.body.entries.map((e: { email: string }) => e.email)).toEqual(["a@example.com", "b@example.com"]);
  });
});
