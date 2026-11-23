(() => {
  const models = [
    ["CogVideoX 1.5", "cogvideox15"], ["HunyuanVideo 1.5", "hunyuan15"],
    ["LTX 2.5", "ltx25"], ["MiniMax H3", "minimaxh3"], ["Seedance 2", "seedance2"],
    ["Wan 2.1", "wan21"], ["Wan 2.2", "wan22"], ["Wan 3.0", "wan30"],
    ["Ours (MiniMax H3)", ""],
  ];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const visible = new Set();

  function updateVideo(video) {
    const group = video.closest(".comparison-case");
    const enabled = !group.hidden && group.dataset.playing === "true";
    if (!visible.has(video) || !enabled || document.hidden) {
      video.pause();
      return;
    }
    if (!video.hasAttribute("src")) video.src = video.dataset.src;
    video.play().catch(() => {});
  }

  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.intersectionRatio >= 0.15) visible.add(video);
      else visible.delete(video);
      updateVideo(video);
    }
  }, {threshold:[0, 0.15]});

  // Release offscreen decoders as the reader moves between the nine cases.
  const distant = new IntersectionObserver(entries => {
    for (const {target: video, isIntersecting} of entries) {
      if (!isIntersecting && video.hasAttribute("src") && !visible.has(video)) {
        video.removeAttribute("src");
        video.load();
      }
    }
  }, {rootMargin:"600px"});

  document.addEventListener("visibilitychange", () => visible.forEach(updateVideo));

  const preview = document.getElementById("reference-preview");
  const previewImage = preview.querySelector("img");
  const previewCaption = preview.querySelector("p");
  preview.querySelector("button").onclick = () => preview.close();
  preview.addEventListener("click", event => {
    if (event.target === preview) preview.close();
  });
  document.getElementById("comparisons").addEventListener("click", event => {
    const link = event.target.closest(".reference-mosaic a, .knowledge-term");
    if (!link || !preview.showModal || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    previewImage.src = link.href;
    const thumbnail = link.querySelector("img") || link.closest(".comparison-case")
      .querySelector('.reference-mosaic a[href="' + link.getAttribute("href") + '"] img');
    previewImage.alt = thumbnail.alt;
    previewCaption.textContent = previewImage.alt;
    preview.showModal();
  });

  const groups = Array.from(document.querySelectorAll(".comparison-case"));
  let active = 0;

  function showComparison(index) {
    const previous = groups[active];
    if (previous !== groups[index]) {
      previous.hidden = true;
      for (const video of previous.querySelectorAll("video[src]")) {
        visible.delete(video);
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    }
    active = index;
    groups[index].hidden = false;
    document.getElementById("comparison-status").textContent = groups[index].querySelector("h3").textContent;
  }

  function fromHash() {
    const index = groups.findIndex(group => "#" + group.getAttribute("aria-labelledby") === location.hash);
    if (index >= 0) {
      showComparison(index);
      groups[index].querySelector("h3").scrollIntoView({behavior:"instant", block:"start"});
    }
  }

  function pageBy(delta) {
    const index = (active + delta + groups.length) % groups.length;
    showComparison(index);
    const heading = groups[index].querySelector("h3");
    history.replaceState(history.state, "", "#" + heading.id);
    if (heading.getBoundingClientRect().top < 0) heading.scrollIntoView({behavior:"instant", block:"start"});
  }

  document.querySelector(".comparison-prev").onclick = () => pageBy(-1);
  document.querySelector(".comparison-next").onclick = () => pageBy(1);
  window.addEventListener("hashchange", fromHash);
  fromHash();

  for (const group of groups) {
    const grid = group.querySelector(".comparison-grid");
    const pair = grid.querySelector(".comparison-pair");
    const title = group.querySelector("h3").textContent;
    const play = group.querySelector(".comparison-playback");
    function setPlayback(enabled) {
      group.dataset.playing = String(enabled);
      play.classList.toggle("playing", enabled);
      const action = enabled ? "Pause" : "Play";
      play.setAttribute("aria-label", action + " videos for " + title);
      play.title = action + " comparison";
      grid.querySelectorAll("video").forEach(updateVideo);
    }
    setPlayback(!reducedMotion.matches);
    play.onclick = () => setPlayback(group.dataset.playing !== "true");
    reducedMotion.addEventListener("change", () => setPlayback(!reducedMotion.matches));

    for (const [label, folder] of models) {
      const path = "./media/" + group.dataset.case + "/" + (folder ? folder + "/" : "");
      const figure = document.createElement("figure");
      if (!folder) figure.classList.add("comparison-ours");
      const frame = document.createElement("div");
      frame.className = "comparison-frame";
      const video = document.createElement("video");
      video.muted = video.defaultMuted = video.loop = video.playsInline = true;
      video.preload = "none";
      video.poster = path + "poster.jpg";
      video.dataset.src = path + "video.mp4";
      video.setAttribute("aria-label", title + " — " + label);
      frame.append(video);
      if (frame.requestFullscreen || video.webkitEnterFullscreen) {
        const expand = document.createElement("button");
        expand.type = "button";
        expand.className = "comparison-expand";
        expand.setAttribute("aria-label", "Full screen: " + title + " — " + label);
        expand.onclick = async () => {
          if (!video.hasAttribute("src")) video.src = video.dataset.src;
          if (document.fullscreenElement === frame) await document.exitFullscreen();
          else if (frame.requestFullscreen) await frame.requestFullscreen();
          else video.webkitEnterFullscreen();
        };
        frame.append(expand);
      }
      const caption = document.createElement("figcaption");
      caption.textContent = label;
      figure.append(frame, caption);
      if (folder) grid.insertBefore(figure, pair);
      else pair.prepend(figure);
      visibility.observe(video);
      distant.observe(video);
    }
  }
})();
