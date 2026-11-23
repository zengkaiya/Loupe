// Map each recorded tool turn to the same message types used in the paper gallery.
function dialogueMessages(item, h, ResultVideo) {
  const messages = [];
  function add(type, variant, content, options = {}) {
    messages.push({id: messages.length + 1, sender: "left", type, variant, content, ...options});
  }
  add("text", "prompt", item.prompt, {sender:"right"});
  const tools = {search:"Web search", image_search:"Image search", browse:"Browse"};
  for (const step of item.steps) {
    if (step.tool === "answer") continue;
    const calls = step.calls || [];
    add("queries", "plan", "", {
      label: calls.length === 1 ? tools[calls[0].name] : "Search plan",
      loader: {enabled:true, delay:70, duration:220},
      render: () => h("div", {className:"chat-queries"}, calls.map((call, index) => {
        const queries = [].concat(call.arguments.query || []);
        return h("div", {key:index},
          calls.length > 1 && h("strong", null, tools[call.name]),
          queries.map((query, i) => h("p", {key:i}, query)),
          call.name === "browse" && [].concat(call.arguments.url || []).map(url =>
            h("a", {key:url, href:url, target:"_blank", rel:"noopener noreferrer"}, new URL(url).hostname)));
      })),
    });
    if (step.images?.length) {
      add("image-grid", "reference", "", {
        label:"Image search results",
        imageItems:step.images.map(img => ({src:img.image, alt:img.id + " · " + img.title})),
      });
    }
    const links = [...(step.response || "").matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g)]
      .slice(0, 3).map(match => ({text:match[1], url:match[2]}));
    add(links.length ? "text-with-links" : "text", "evidence", step.summary, {
      label:step.images?.length ? "Visual evidence" : "Web evidence", links,
    });
  }

  // Render the two fields of the source <answer> intact, including every
  // selected image ID and its original selection note.
  add("answer", "result", "", {
    label:"Final answer · Video prompt", maxWidth:"max-w-lg",
    render:() => h("p", {className:"chat-final-prompt"}, item.videoPrompt),
  });
  if (item.references.length) {
    add("selected", "reference", "", {
      label:"Selected references", maxWidth:"max-w-md",
      render:openImage => h("div", {className:"chat-selected"}, item.references.map(ref =>
        h("figure", {key:ref.id},
          h("button", {type:"button", "aria-label":"Enlarge " + ref.id, onClick:() => openImage({src:ref.image,alt:ref.title || ref.id})},
            h("img", {src:ref.image, alt:ref.title || ref.id, loading:"lazy"})),
          h("figcaption", null, h("strong", null, ref.id), h("p", null, ref.note))))),
    });
  }
  add("video", "result", "", {
    label:"Generated video", maxWidth:"max-w-lg",
    render:() => h(ResultVideo, {item}),
  });
  return messages;
}

function mountDialogue(React, createRoot, {Dialogue, avatar}) {
  const h = React.createElement;
  const ResultVideo = createResultVideo(React);
  const panel = document.querySelector("#case-detail");
  const root = createRoot(panel);
  const leftPerson = {name:"Loupe", avatar:avatar("L", "#5243a0", "#f0eaff")};
  const rightPerson = {name:"Prompt", avatar:avatar("P", "#30465e", "#e2efff")};
  let generation = 0;
  let observer;
  return function displayCase(item, selected = false) {
    observer?.disconnect();
    panel.querySelector("video")?.pause();
    const key = ++generation;
    const config = {leftPerson, rightPerson, messages:dialogueMessages(item, h, ResultVideo)};
    function show(play) {
      if (key !== generation) return;
      root.render(h(React.Fragment, null,
        h("header", {className:"dialogue-head"},
          h("div", null, h("h2", {className:"dialogue-label"}, "Search dialogue"),
            h("h3", null, item.title)),
          h("span", {className:"case-id"}, "Case #" + item.id)),
        h("div", {className:"chat-window h-[52rem]"},
          h(Dialogue, {key, config, play, timingScale:3.95, uiConfig:{backgroundColor:"transparent", autoRestart:false, leftChat:{nameColor:"#beb5ed"}, rightChat:{nameColor:"#a1bad4"}, loader:{dotColor:"#b6a7ff"}}}))));
    }
    show(selected);
    if (selected) return;
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && generation === key) {
        observer.disconnect();
        show(true);
      }
    }, {threshold:.25});
    observer.observe(panel);
  };
}

function createResultVideo(React) {
  const h = React.createElement;
  const iconFrame = {viewBox:"0 0 24 24", width:20, height:20, "aria-hidden":true, focusable:"false"};
  const playIcon = h("svg", iconFrame, h("path", {fill:"currentColor", d:"M6 3.8v16.4L20 12z"}));
  const pauseIcon = h("svg", iconFrame, h("path", {fill:"currentColor", d:"M6 4h4v16H6zM14 4h4v16h-4z"}));
  const corners = {fill:"none", stroke:"currentColor", strokeWidth:2, strokeLinecap:"round", strokeLinejoin:"round"};
  const expandIcon = h("svg", iconFrame, h("path", {...corners, d:"M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"}));
  const collapseIcon = h("svg", iconFrame, h("path", {...corners, d:"M9 4v5H4m16 0h-5V4m0 16v-5h5M4 15h5v5"}));
  function iconButton(label, onClick, icon, className = "player-icon") {
    return h("button", {className, type:"button", "aria-label":label, title:label, onClick}, icon);
  }
  return function ResultVideo({item}) {
    const video = React.useRef(null);
    const frame = React.useRef(null);
    const [playing, setPlaying] = React.useState(false);
    const [fullscreen, setFullscreen] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    React.useEffect(() => {
      const syncFullscreen = () => setFullscreen(document.fullscreenElement === frame.current);
      document.addEventListener("fullscreenchange", syncFullscreen);
      return () => document.removeEventListener("fullscreenchange", syncFullscreen);
    }, []);
    function togglePlayback() {
      const media = video.current;
      if (media.paused) media.play().catch(() => {});
      else media.pause();
    }
    function seek(event) {
      const fraction = Number(event.target.value);
      if (Number.isFinite(video.current.duration)) video.current.currentTime = fraction * video.current.duration;
      setProgress(fraction);
    }
    function toggleFullscreen() {
      if (document.fullscreenElement === frame.current) document.exitFullscreen();
      else frame.current.requestFullscreen().catch(() => {});
    }
    return h("div", {className:"result-player", ref:frame},
      h("video", {className:"chat-result-video", ref:video, src:item.video, poster:item.poster,
        autoPlay:true, muted:true, playsInline:true, preload:"metadata", "aria-label":item.title,
        onClick:togglePlayback, onPlay:() => setPlaying(true), onPause:() => setPlaying(false),
        onTimeUpdate:event => {
          const media = event.currentTarget;
          if (media.duration > 0) setProgress(media.currentTime / media.duration);
        }}),
      h("div", {className:"result-controls"},
        h("input", {className:"result-seek", type:"range", min:0, max:1, step:.001, value:progress,
          "aria-label":"Video progress", "aria-valuetext":Math.round(progress * 100) + "%", onChange:seek}),
        iconButton(playing ? "Pause" : "Play", togglePlayback, playing ? pauseIcon : playIcon),
        document.fullscreenEnabled && iconButton(fullscreen ? "Exit full screen" : "Enter full screen",
          toggleFullscreen, fullscreen ? collapseIcon : expandIcon, "player-icon result-fullscreen")));
  };
}
