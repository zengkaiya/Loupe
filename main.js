(self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([
  ["loupe-home"], {},
  function mount(require) {
    const displayCase = mountDialogue(require(2115), require(9248).createRoot, require(4088));
    const cases = window.loupeCases;
    const batchSize = 6;
    const pageCount = Math.ceil(cases.length / batchSize);
    const featuredIds = [1, 267, 1130, 302, 303, 4491, 1359, 1025];
    const featured = featuredIds.map(id => cases.find(item => item.id === id));
    const rail = document.getElementById("case-gallery");
    const track = document.getElementById("filmstrip");
    const video = document.getElementById("featured-video");
    const toggle = document.getElementById("preview-toggle");
    let activeCase = 0;
    let batch = 0;
    let featuredIndex = 0;
    let inView = false;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let wantsPlayback = !reducedMotion.matches;
    function select(index) {
      activeCase = index;
      batch = Math.floor(index / batchSize);
      drawCases();
      displayCase(cases[index], true);
      document.getElementById("case-detail").scrollIntoView({behavior:reducedMotion.matches ? "instant" : "smooth", block:"start"});
    }

    function drawCases() {
      const cards = cases.slice(batch * batchSize, (batch + 1) * batchSize).map((item, offset) => {
        const index = batch * batchSize + offset;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "case-card";
        button.setAttribute("aria-label", item.title);
        button.setAttribute("aria-pressed", String(index === activeCase));
        const frame = document.createElement("span");
        frame.className = "case-frame";
        const image = new Image();
        image.src = item.poster;
        image.alt = "";
        frame.append(image);
        const title = document.createElement("strong");
        title.textContent = item.title;
        button.append(frame, title);
        button.onclick = () => select(index);
        return button;
      });
      rail.replaceChildren(...cards);
      rail.scrollLeft = 0;
    }

    function pageBy(delta) {
      batch = (batch + delta + pageCount) % pageCount;
      drawCases();
    }
    document.getElementById("previous").onclick = () => pageBy(-1);
    document.getElementById("next").onclick = () => pageBy(1);

    function syncPlayback() {
      if (inView && !document.hidden && wantsPlayback) video.play().catch(() => {});
      else video.pause();
    }
    function syncTransport() {
      toggle.classList.toggle("playing", !video.paused);
      toggle.setAttribute("aria-label", video.paused ? "Play preview" : "Pause preview");
    }
    function syncProgress() {
      const duration = featured[featuredIndex].duration;
      document.getElementById("elapsed").style.transform = "scaleX(" + Math.min(1, video.currentTime / duration) + ")";
    }
    function changeFeature(index) {
      featuredIndex = index;
      const item = featured[index];
      video.poster = item.poster;
      video.src = item.video;
      video.setAttribute("aria-label", item.title + " preview");
      document.getElementById("featured-title").textContent = item.title;
      track.querySelectorAll("button").forEach(button => {
        button.setAttribute("aria-pressed", String(Number(button.dataset.index) === index));
      });
      syncProgress();
      syncPlayback();
    }
    for (const [index, item] of featured.entries()) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.index = index;
      // Start the first thumbnail at the top, spacing the others around the orbit.
      button.style.setProperty("--orbit-phase", -(0.75 + index / featured.length));
      button.setAttribute("aria-label", "Preview " + item.title);
      button.setAttribute("aria-pressed", String(index === 0));
      const image = new Image();
      image.src = item.poster;
      image.alt = "";
      button.append(image);
      button.onclick = () => changeFeature(index);
      track.append(button);
    }
    toggle.onclick = () => { wantsPlayback = video.paused; syncPlayback(); };
    document.getElementById("open-feature").onclick = () => select(cases.indexOf(featured[featuredIndex]));
    video.addEventListener("ended", () => {
      if (video.ended && wantsPlayback) changeFeature((featuredIndex + 1) % featured.length);
    });
    video.addEventListener("play", syncTransport);
    video.addEventListener("pause", syncTransport);
    video.addEventListener("timeupdate", syncProgress);
    document.addEventListener("visibilitychange", syncPlayback);
    reducedMotion.addEventListener("change", () => {wantsPlayback = !reducedMotion.matches; syncPlayback();});
    new IntersectionObserver(([entry]) => {inView = entry.isIntersecting; syncPlayback();}).observe(video);
    drawCases();
    displayCase(cases[0]);
  },
]);
