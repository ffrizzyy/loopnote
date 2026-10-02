import request from "supertest";
import { createApp } from "../app";

describe("GET /topics", () => {
  it("lists topics alphabetically", async () => {
    const { app, topicsRepo } = createApp();
    topicsRepo.create("Chemistry");
    topicsRepo.create("Biology");

    const res = await request(app).get("/topics");
    expect(res.status).toBe(200);
    expect(res.body.topics.map((t: { name: string }) => t.name)).toEqual(["Biology", "Chemistry"]);
  });

  it("returns an empty list when no topics exist yet", async () => {
    const { app } = createApp();
    const res = await request(app).get("/topics");
    expect(res.body.topics).toEqual([]);
  });
});
