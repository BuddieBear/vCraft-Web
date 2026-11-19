import { mediaUrl } from "../api/http.js";
import { icon } from "../components/ui.js";
import { describeSilkStages } from "../data/silk-stages.js";

const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

export function renderTimeline(target, batch, accordion) {
  const heading = document.createElement("h3");
  heading.textContent = batch.product.name;
  const progress = document.createElement("p");
  const state = batch.status === "COMPLETED" ? "Đã hoàn thành" : "Đang sản xuất";
  const steps = describeSilkStages(batch.logs);
  const recorded = steps.filter(step => step.log).length;
  progress.textContent = `${batch.product.artisan.workshopName} · ${state} · ${recorded}/${steps.length} công đoạn đã ghi nhận`;
  target.replaceChildren(heading, progress);
  const storyText = batch.product.culturalStory || batch.product.description;
  if (storyText) {
    const story = document.createElement("p");
    story.className = "batch-story";
    story.textContent = storyText;
    target.append(story);
  }
  target.append(stageList(steps, accordion));
}

function stageList(steps, accordion) {
  const stages = document.createElement("div");
  stages.className = "stage-list";
  for (const [index, { number, title, guide, log }] of steps.entries()) {
    const stage = document.createElement("details");
    stage.name = accordion;
    stage.open = index === 0;
    stage.innerHTML = `<summary><span class="stage-number"></span><span class="stage-overview"><span></span><small></small></span>${icon("plus")}</summary>`;
    stage.querySelector(".stage-number").textContent = number;
    stage.querySelector(".stage-overview span").textContent = title;
    stage.querySelector("small").textContent = guide;
    if (log) {
      renderStageNote(stage, log, title);
      stage.append(stageMedia(log));
    } else {
      const pending = document.createElement("p");
      pending.textContent = "Chưa có nhật ký cho công đoạn này.";
      stage.append(pending);
    }
    stages.append(stage);
  }
  return stages;
}

function renderStageNote(target, log, title) {
  if (log.loggedAt) {
    const time = document.createElement("time");
    time.dateTime = log.loggedAt;
    time.textContent = date.format(new Date(log.loggedAt));
    target.append(time);
  }
  const note = document.createElement("p");
  const label = title.toLowerCase().includes(log.stageTitle.toLowerCase()) ? "Ghi chú của lô" : log.stageTitle;
  const heading = document.createElement("strong");
  heading.textContent = label;
  note.append(heading, document.createElement("br"), log.description);
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
