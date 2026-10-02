import { NotesRepository } from "../db/notesRepository";
import { TopicsRepository } from "../db/topicsRepository";
import { TopicSignature } from "./matchTopic";

/** One topic's aggregated tags, from every note currently assigned to it. */
export function buildTopicSignatures(topicsRepo: TopicsRepository, notesRepo: NotesRepository): TopicSignature[] {
  return topicsRepo.list().map((topic) => {
    const notes = notesRepo.listByTopic(topic.id);
    const tags = Array.from(new Set(notes.flatMap((note) => note.tags)));
    return { topicId: topic.id, topicName: topic.name, tags };
  });
}
