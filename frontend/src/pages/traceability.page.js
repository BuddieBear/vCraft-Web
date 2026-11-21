import { mediaUrl } from "../api/http.js";
import { icon } from "../components/ui.js";

const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

export function renderTimeline(target, batch, accordion) {
  const heading = document.createElement("h3");
  heading.textContent = batch.product.name;
  const progress = document.createElement("p");
  const state = batch.status === "COMPLETED" ? "Đã hoàn thành" : "Đang sản xuất";
  progress.textContent = `${batch.product.artisan.workshopName} · ${state} · ${batch.logs.length} công đoạn đã ghi nhận`;
  target.replaceChildren(heading, progress);
  const storyText = batch.product.culturalStory || batch.product.description;
  if (storyText) {
    const story = document.createElement("p");
    story.className = "batch-story";
    story.textContent = storyText;
    target.append(story);
  }
  if (batch.logs.length) target.append(stageList(batch.logs, accordion));
  else {
    const pending = document.createElement("p");
    pending.textContent = "Lô chưa có công đoạn nào được ghi nhận.";
    target.append(pending);
  }
}

function stageList(logs, accordion) {
  const stages = document.createElement("div");
  stages.className = "stage-list";
  for (const [index, log] of logs.entries()) {
    const stage = document.createElement("details");
    stage.name = accordion;
    stage.open = index === 0;
    stage.innerHTML = `<summary><span class="stage-number"></span><span class="stage-overview"></span>${icon("plus")}</summary>`;
    stage.querySelector(".stage-number").textContent = String(index + 1).padStart(2, "0");
    stage.querySelector(".stage-overview").textContent = log.stageTitle;
    renderStageNote(stage, log);
    stage.append(stageMedia(log));
    stages.append(stage);
  }
  return stages;
}

function renderStageNote(target, log) {
  if (log.loggedAt) {
    const time = document.createElement("time");
    time.dateTime = log.loggedAt;
    time.textContent = date.format(new Date(log.loggedAt));
    target.append(time);
  }
  const note = document.createElement("p");
  note.textContent = log.description;
  target.append(note);
}

function stageMedia(log) {
  const media = document.createDocumentFragment();
  const evidence = log.evidenceImageUrls.map(mediaUrl).filter(Boolean);
  for (const src of evidence) {
    const image = document.createElement("img");
    image.src = src;
    image.alt = `Minh chứng công đoạn ${log.stageTitle}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    media.append(image);
  }
  return media;
}
