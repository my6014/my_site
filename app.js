/* ============================================
   Y2K Desktop — Window Manager & OS Simulation
   ============================================ */

(function () {
  "use strict";

  // ---- State ----
  let zIndexCounter = 100;
  let focusedWindow = null;
  let windows = {}; // id -> { node, title, app, taskbarBtn, maximized, prevBounds }
  let desktopIcons = [];

  // ---- DOM refs ----
  const desktop = document.getElementById("desktop");
  const taskbarWindows = document.getElementById("taskbar-windows");
  const startBtn = document.getElementById("start-btn");
  const startMenu = document.getElementById("start-menu");
  const shutdownOverlay = document.getElementById("shutdown-overlay");
  const clockEl = document.getElementById("clock");

  // ---- Initialize ----
  function init() {
    // Desktop icon events
    desktopIcons = document.querySelectorAll(".desktop-icon");
    desktopIcons.forEach((icon) => {
      icon.addEventListener("dblclick", () => {
        const app = icon.dataset.app;
        if (app) openWindow(app);
      });
      icon.addEventListener("click", (e) => {
        e.stopPropagation();
        desktopIcons.forEach((i) => i.classList.remove("selected"));
        icon.classList.add("selected");
      });
    });

    // Start menu button
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleStartMenu();
    });

    // Start menu items
    document.querySelectorAll(".start-item[data-app]").forEach((item) => {
      item.addEventListener("click", () => {
        openWindow(item.dataset.app);
        hideStartMenu();
      });
    });

    // Shutdown
    document.getElementById("shutdown-btn").addEventListener("click", () => {
      hideStartMenu();
      doShutdown();
    });

    // Close start menu on outside click
    document.addEventListener("click", (e) => {
      if (!startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
        hideStartMenu();
      }
      // Deselect desktop icons
      if (e.target === desktop || e.target === document.body) {
        desktopIcons.forEach((i) => i.classList.remove("selected"));
      }
    });

    // Restart button
    document.getElementById("restart-btn").addEventListener("click", restart);

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Keyboard shortcut: Alt+F4 to close focused window
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        if (focusedWindow) closeWindow(focusedWindow);
      }
    });

    console.log("Personal desktop initialized. Type 'help' in DOS for commands!");

    // Auto-open About Me window on first visit
    setTimeout(() => openWindow("aboutme"), 800);
  }

  // ============================================
  //  Clock
  // ============================================

  function updateClock() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    const mm = m < 10 ? "0" + m : m;
    clockEl.textContent = `${h}:${mm} ${ampm}`;
  }

  // ============================================
  //  Start Menu
  // ============================================

  function toggleStartMenu() {
    if (startMenu.classList.contains("hidden")) {
      showStartMenu();
    } else {
      hideStartMenu();
    }
  }

  function showStartMenu() {
    startMenu.classList.remove("hidden");
    startBtn.classList.add("active");
  }

  function hideStartMenu() {
    startMenu.classList.add("hidden");
    startBtn.classList.remove("active");
  }

  // ============================================
  //  Window Manager
  // ============================================

  function openWindow(app) {
    // If window already exists and is minimized, restore it
    if (windows[app]) {
      const win = windows[app];
      if (win.node.classList.contains("minimized")) {
        restoreWindow(win);
      }
      focusWindow(win.node);
      return;
    }

    const tmpl = document.getElementById("tmpl-" + app);
    if (!tmpl) {
      console.error("No template for app:", app);
      return;
    }

    const clone = tmpl.querySelector(".window").cloneNode(true);
    const screen = document.getElementById("monitor-screen");
    screen.appendChild(clone);

    // Center the About Me window on screen
    if (app === "aboutme") {
      const sw = screen.clientWidth;
      const sh = screen.clientHeight - 38; // taskbar
      const ww = clone.offsetWidth || 420;
      const wh = clone.offsetHeight || 380;
      clone.style.left = Math.max(0, (sw - ww) / 2) + "px";
      clone.style.top = Math.max(0, (sh - wh) / 2) + "px";
    }

    const titleEl = clone.querySelector(".titlebar-text");
    const title = titleEl ? titleEl.textContent.trim() : app;

    // Setup buttons
    clone.querySelector(".btn-minimize")?.addEventListener("click", (e) => {
      e.stopPropagation();
      minimizeWindow(clone);
    });
    clone.querySelector(".btn-maximize")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMaximize(clone);
    });
    clone.querySelector(".btn-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeWindow(clone);
    });

    // Focus on click
    clone.addEventListener("mousedown", () => focusWindow(clone));

    // Dragging
    setupDrag(clone);

    // Resize handles
    setupResize(clone);

    // Taskbar button
    const taskBtn = document.createElement("button");
    taskBtn.className = "taskbar-window-btn active";
    taskBtn.textContent = title;
    taskBtn.addEventListener("click", () => {
      if (clone.classList.contains("minimized")) {
        restoreWindowByNode(clone);
      } else if (focusedWindow === clone) {
        minimizeWindow(clone);
      } else {
        focusWindow(clone);
      }
    });
    taskbarWindows.appendChild(taskBtn);

    windows[app] = {
      node: clone,
      title,
      app,
      taskbarBtn: taskBtn,
      maximized: false,
      prevBounds: null,
    };

    // Show window
    clone.classList.remove("hidden");
    focusWindow(clone);

    // Init per-app logic
    if (app === "dos") initDOS(clone);
    if (app === "aboutme") initAboutMe(clone);
    if (app === "contact") initContact(clone);
    if (app === "notepad") initNotepad(clone);
    if (app === "browser") initBrowser(clone);

  }

  function focusWindow(winNode) {
    if (focusedWindow === winNode) return;
    // Unfocus previous
    if (focusedWindow) {
      focusedWindow.classList.remove("focused");
      const prevWin = findWindowByNode(focusedWindow);
      if (prevWin && prevWin.taskbarBtn) {
        prevWin.taskbarBtn.classList.remove("active");
        prevWin.taskbarBtn.classList.add("inactive");
      }
    }
    // Focus new
    focusedWindow = winNode;
    winNode.classList.add("focused");
    winNode.style.zIndex = ++zIndexCounter;
    const win = findWindowByNode(winNode);
    if (win && win.taskbarBtn) {
      win.taskbarBtn.classList.add("active");
      win.taskbarBtn.classList.remove("inactive");
    }
    // Bring out of minimized state
    if (winNode.classList.contains("minimized")) {
      restoreWindowByNode(winNode);
    }
  }

  function minimizeWindow(winNode) {
    winNode.classList.add("minimized");
    winNode.classList.remove("focused");
    const win = findWindowByNode(winNode);
    if (win && win.taskbarBtn) {
      win.taskbarBtn.classList.remove("active");
      win.taskbarBtn.classList.add("inactive");
    }
    if (focusedWindow === winNode) {
      focusedWindow = null;
      // focus next visible window
      focusNextWindow();
    }
  }

  function restoreWindow(win) {
    win.node.classList.remove("minimized");
    focusWindow(win.node);
  }

  function restoreWindowByNode(winNode) {
    winNode.classList.remove("minimized");
    focusWindow(winNode);
  }

  function toggleMaximize(winNode) {
    const win = findWindowByNode(winNode);
    if (!win) return;

    if (win.maximized) {
      // Restore
      if (win.prevBounds) {
        winNode.style.top = win.prevBounds.top;
        winNode.style.left = win.prevBounds.left;
        winNode.style.width = win.prevBounds.width;
        winNode.style.height = win.prevBounds.height;
      }
      winNode.style.borderWidth = "";
      win.maximized = false;
    } else {
      // Maximize
      win.prevBounds = {
        top: winNode.style.top || winNode.offsetTop + "px",
        left: winNode.style.left || winNode.offsetLeft + "px",
        width: winNode.style.width || winNode.offsetWidth + "px",
        height: winNode.style.height || winNode.offsetHeight + "px",
      };
      winNode.style.top = "0px";
      winNode.style.left = "0px";
      winNode.style.width = `calc(100vw - 4px)`;
      winNode.style.height = `calc(100vh - 42px)`;
      winNode.style.borderWidth = "0";
      win.maximized = true;
    }
  }

  function closeWindow(winNode) {
    const win = findWindowByNode(winNode);
    if (!win) return;

    if (win.taskbarBtn) win.taskbarBtn.remove();
    delete windows[win.app];
    winNode.remove();

    if (focusedWindow === winNode) {
      focusedWindow = null;
      focusNextWindow();
    }
  }

  function focusNextWindow() {
    const visibleWindows = Object.values(windows).filter(
      (w) => !w.node.classList.contains("minimized")
    );
    if (visibleWindows.length > 0) {
      focusWindow(visibleWindows[visibleWindows.length - 1].node);
    }
  }

  function findWindowByNode(node) {
    for (const key in windows) {
      if (windows[key].node === node) return windows[key];
    }
    return null;
  }

  // ============================================
  //  Drag & Resize
  // ============================================

  function setupDrag(winNode) {
    const titlebar = winNode.querySelector(".titlebar");
    if (!titlebar) return;

    let startX, startY, startLeft, startTop, dragging = false;

    titlebar.addEventListener("mousedown", (e) => {
      if (e.target.closest(".titlebar-btns")) return; // don't drag from buttons
      const win = findWindowByNode(winNode);
      if (win && win.maximized) return;

      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = winNode.offsetLeft;
      startTop = winNode.offsetTop;
      winNode.classList.add("dragging");

      function onMove(ev) {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        winNode.style.left = Math.max(-100, startLeft + dx) + "px";
        winNode.style.top = Math.max(0, startTop + dy) + "px";
      }

      function onUp() {
        dragging = false;
        winNode.classList.remove("dragging");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function setupResize(winNode) {
    const directions = ["n","s","e","w","ne","nw","se","sw"];
    directions.forEach((dir) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${dir}`;
      winNode.appendChild(handle);

      let startX, startY, startW, startH, startL, startT, resizing = false;

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = winNode.offsetWidth;
        startH = winNode.offsetHeight;
        startL = winNode.offsetLeft;
        startT = winNode.offsetTop;
        winNode.classList.add("resizing");

        function onMove(ev) {
          if (!resizing) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          let newW = startW, newH = startH, newL = startL, newT = startT;

          if (dir.includes("e")) newW = Math.max(200, startW + dx);
          if (dir.includes("w")) { newW = Math.max(200, startW - dx); newL = startL + dx; }
          if (dir.includes("s")) newH = Math.max(120, startH + dy);
          if (dir.includes("n")) { newH = Math.max(120, startH - dy); newT = startT + dy; }

          if (dir === "e" || dir === "w") newH = startH;
          if (dir === "n" || dir === "s") newW = startW;

          winNode.style.width = newW + "px";
          winNode.style.height = newH + "px";
          if (dir.includes("w")) winNode.style.left = newL + "px";
          if (dir.includes("n")) winNode.style.top = newT + "px";
        }

        function onUp() {
          resizing = false;
          winNode.classList.remove("resizing");
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        }

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
  }

  // ============================================
  //  DOS Prompt Simulation
  // ============================================

  let dosCwd = "C:\\WINDOWS";
  let dosHistory = [];
  let dosHistoryIdx = -1;

  function initDOS(winNode) {
    const output = winNode.querySelector(".dos-output");
    const input = winNode.querySelector(".dos-input");

    if (!input || !output) return;

    input.focus();

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = input.value.trim();
        input.value = "";
        dosHistory.push(cmd);
        dosHistoryIdx = dosHistory.length;
        executeDOS(cmd, output);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (dosHistoryIdx > 0) {
          dosHistoryIdx--;
          input.value = dosHistory[dosHistoryIdx] || "";
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (dosHistoryIdx < dosHistory.length - 1) {
          dosHistoryIdx++;
          input.value = dosHistory[dosHistoryIdx] || "";
        } else {
          dosHistoryIdx = dosHistory.length;
          input.value = "";
        }
      }
    });

    // Focus input when clicking anywhere in the DOS window
    winNode.addEventListener("mousedown", () => {
      setTimeout(() => input.focus(), 10);
    });
  }

  function appendDosLine(output, text, className) {
    const div = document.createElement("div");
    if (text.includes("&")) {
      div.textContent = text;
    } else {
      div.innerHTML = text;
    }
    if (className) div.className = className;
    // Replace last prompt line
    const lines = output.querySelectorAll("div");
    if (lines.length > 0) {
      const last = lines[lines.length - 1];
      if (last.textContent.trim().endsWith("_")) {
        // Remove blinking cursor from previous prompt
        const span = last.querySelector(".blink");
        if (span) span.remove();
        last.textContent = last.textContent.replace(/\u00A0/g, " ").trim();
      }
    }
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function appendDosPrompt(output) {
    const div = document.createElement("div");
    div.textContent = "\u00A0";
    output.appendChild(div);
    const promptDiv = document.createElement("div");
    promptDiv.innerHTML = `${dosCwd}&gt;<span class="blink">_</span>`;
    output.appendChild(promptDiv);
    output.scrollTop = output.scrollHeight;
  }

  function executeDOS(cmd, output) {
    // Show command in output
    const cmdDiv = document.createElement("div");
    cmdDiv.textContent = `${dosCwd}>${cmd}`;
    output.appendChild(cmdDiv);

    const parts = cmd.toLowerCase().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case "":
        break;
      case "help":
        appendDosLine(output, "Available commands:");
        appendDosLine(output, "  ABOUT    - Who am I?");
        appendDosLine(output, "  SKILLS   - Show my tech stack");
        appendDosLine(output, "  PROJECTS - Show my projects");
        appendDosLine(output, "  CONTACT  - How to reach me");
        appendDosLine(output, "  GITHUB   - Open my GitHub profile");
        appendDosLine(output, "  HELP     - Show this message");
        appendDosLine(output, "  VER      - Display DOS version");
        appendDosLine(output, "  DIR      - List directory contents");
        appendDosLine(output, "  CLS      - Clear screen");
        appendDosLine(output, "  DATE     - Show current date");
        appendDosLine(output, "  TIME     - Show current time");
        appendDosLine(output, "  ECHO     - Print a message");
        appendDosLine(output, "  MEM      - Show memory usage");
        appendDosLine(output, "  EXIT     - Close this window");
        break;
      case "ver":
        appendDosLine(output, "");
        appendDosLine(output, "Windows Me [Version 4.90.3000]");
        break;
      case "dir":
        appendDosLine(output, ` Volume in drive C is Y2K_SYSTEM`);
        appendDosLine(output, ` Volume Serial Number is 2000-0721`);
        appendDosLine(output, ` Directory of ${dosCwd}`);
        appendDosLine(output, "");
        appendDosLine(output, ".            <DIR>         07-21-00  12:00p .");
        appendDosLine(output, "..           <DIR>         07-21-00  12:00p ..");
        appendDosLine(output, "SYSTEM       <DIR>         07-15-00   9:30a SYSTEM");
        appendDosLine(output, "WIN      COM         5,120 06-08-00  12:00a WIN.COM");
        appendDosLine(output, "NOTEPAD  EXE        34,816 06-08-00  12:00a NOTEPAD.EXE");
        appendDosLine(output, "README   TXT         1,024 07-20-00  10:15a README.TXT");
        appendDosLine(output, "CONFIG   SYS           256 07-01-00   8:00a CONFIG.SYS");
        appendDosLine(output, "AUTOEXEC BAT           512 07-01-00   8:00a AUTOEXEC.BAT");
        appendDosLine(output, "         6 file(s)         41,728 bytes");
        appendDosLine(output, "         3 dir(s)    2,147,123,200 bytes free");
        break;
      case "cls":
        output.innerHTML = "";
        break;
      case "date":
        const now = new Date();
        appendDosLine(output, `The current date is: ${now.toLocaleDateString("en-US", {weekday:"long",year:"numeric",month:"long",day:"numeric"})}`);
        break;
      case "time":
        const t = new Date();
        appendDosLine(output, `The current time is: ${t.toLocaleTimeString("en-US")}`);
        break;
      case "echo":
        appendDosLine(output, args.join(" ") || "ECHO is on.");
        break;
      case "type":
        if (!args[0]) {
          appendDosLine(output, "Syntax: TYPE <filename>");
          break;
        }
        if (args[0].toLowerCase() === "readme.txt") {
          appendDosLine(output, "Welcome to the Y2K Simulated Desktop!");
          appendDosLine(output, "");
          appendDosLine(output, "This is a fake DOS prompt running inside");
          appendDosLine(output, "a simulated Windows Me environment.");
          appendDosLine(output, "Everything is pure HTML, CSS & JavaScript.");
        } else {
          appendDosLine(output, `Could not find: ${args[0]}`);
        }
        break;
      case "cd":
        if (!args[0] || args[0] === "\\") {
          dosCwd = "C:\\";
        } else if (args[0] === "..") {
          const parts2 = dosCwd.split("\\");
          if (parts2.length > 2) {
            parts2.pop();
            dosCwd = parts2.join("\\");
          } else {
            dosCwd = "C:\\";
          }
        } else {
          dosCwd = dosCwd.replace(/\\?$/, "\\") + args[0];
        }
        break;
      case "mem":
        appendDosLine(output, "");
        appendDosLine(output, "Memory Type        Total       Used       Free");
        appendDosLine(output, "----------------  --------   --------   --------");
        appendDosLine(output, "Conventional          640K        128K       512K");
        appendDosLine(output, "Upper                  96K         32K        64K");
        appendDosLine(output, "Reserved                0K          0K         0K");
        appendDosLine(output, "Extended (XMS)     65,472K      2,048K    63,424K");
        appendDosLine(output, "----------------  --------   --------   --------");
        appendDosLine(output, "Total memory       66,208K      2,208K    64,000K");
        appendDosLine(output, "");
        appendDosLine(output, "Largest executable program size: 512K");
        appendDosLine(output, "Largest free upper memory block:  64K");
        appendDosLine(output, "MS-DOS is resident in the high memory area.");
        break;
      case "win":
        appendDosLine(output, "Starting Windows Me...");
        setTimeout(() => {
          appendDosLine(output, "");
          appendDosLine(output, "Welcome to Y2K Desktop! All programs are available from the Start menu.");
        }, 500);
        break;
      case "exit":
        closeWindow(output.closest(".window"));
        return;
      case "about":
        appendDosLine(output, "");
        appendDosLine(output, "+----------------------------------------+");
        appendDosLine(output, "|          马勇 (Ma Yong)                 |");
        appendDosLine(output, "+----------------------------------------+");
        appendDosLine(output, "| 北京交通大学 软件工程 2023-2027        |");
        appendDosLine(output, "| 前端开发 / 测试开发                    |");
        appendDosLine(output, "| 北京市海淀区                           |");
        appendDosLine(output, "+----------------------------------------+");
        appendDosLine(output, "热爱前端技术与软件质量，追求像素级还原。");
        break;
      case "skills":
        appendDosLine(output, "");
        appendDosLine(output, "SKILLS -------------------------------------------------");
        appendDosLine(output, "  Frontend  : React | Vue | Next.js | TypeScript | HTML/CSS");
        appendDosLine(output, "  Backend   : Python | Java | FastAPI");
        appendDosLine(output, "  Database  : PostgreSQL");
        appendDosLine(output, "  Testing   : Jest | Cypress");
        appendDosLine(output, "  Tools     : Git | Docker | VS Code | Linux");
        appendDosLine(output, "----------------------------------------------------------");
        break;
      case "projects":
        appendDosLine(output, "");
        appendDosLine(output, "PROJECTS ------------------------------------------------");
        appendDosLine(output, "  [1] 轨道交通仿真系统 MetroSim");
        appendDosLine(output, "      React 19 + TypeScript + MapLibre GL");
        appendDosLine(output, "      300+ 轨道段 | 60fps | 三重视图 | 5人团队");
        appendDosLine(output, "      https://github.com/Misaka16483/BJTUMetroSim");
        appendDosLine(output, "");
        appendDosLine(output, "  [2] 方言宝 DialectMaster");
        appendDosLine(output, "      Next.js 14 + FastAPI + SenseVoice AI");
        appendDosLine(output, "      AI方言识别 | 8页面全栈 | ECharts可视化");
        appendDosLine(output, "      https://github.com/my6014/Dialect_Master");
        appendDosLine(output, "");
        appendDosLine(output, "  [3] Smart Resume - AI智能求职助手");
        appendDosLine(output, "      Flask + React 18 + Zustand + Tailwind CSS");
        appendDosLine(output, "      12页面SPA | AI简历优化 | 爬虫自动抓取");
        appendDosLine(output, "      https://github.com/YijunSu/smart_resume");
        appendDosLine(output, "----------------------------------------------------------");
        break;
      case "contact":
        appendDosLine(output, "");
        appendDosLine(output, "CONTACT -------------------------------------------------");
        appendDosLine(output, "  Email   : 1806369472@qq.com");
        appendDosLine(output, "  Phone   : 133-8955-4545");
        appendDosLine(output, "  GitHub  : github.com/my6014");
        appendDosLine(output, "  Location: 北京市海淀区");
        appendDosLine(output, "----------------------------------------------------------");
        break;
      case "github":
        appendDosLine(output, "");
        appendDosLine(output, "Opening GitHub profile...");
        setTimeout(() => {
          window.open("https://github.com/my6014", "_blank");
        }, 500);
        break;
      default:
        appendDosLine(output, `Bad command or file name: "${command}"`);
        appendDosLine(output, "Type HELP for a list of available commands.");
        break;
    }

    appendDosPrompt(output);
  }

  // ============================================
  //  AboutMe & Contact init
  // ============================================

  function initAboutMe(winNode) {
    const okBtn = winNode.querySelector(".win-btn");
    if (okBtn) {
      okBtn.addEventListener("click", () => closeWindow(winNode));
    }
  }

  function initContact(winNode) {
    const okBtn = winNode.querySelector(".win-btn");
    if (okBtn) {
      okBtn.addEventListener("click", () => closeWindow(winNode));
    }
    // GitHub link
    const ghLink = winNode.querySelector('[style*="cursor:pointer"]');
    if (ghLink && ghLink.textContent.includes("github.com")) {
      ghLink.addEventListener("click", () => {
        window.open("https://github.com/my6014", "_blank");
      });
    }
  }

  function initNotepad(winNode) {
    const textarea = winNode.querySelector("textarea");
    if (textarea) {
      textarea.focus();
      winNode.addEventListener("mousedown", () => {
        setTimeout(() => textarea.focus(), 10);
      });
    }
  }

  function initBrowser(winNode) {
    const allInputs = Array.from(winNode.querySelectorAll('input[type="text"]'));
    const addrInput = allInputs.find(function(inp) { return !inp.closest('.window-body'); });
    const bodyEl = winNode.querySelector('.window-body');
    const originalBodyHTML = bodyEl.innerHTML;

    // Bind Google search UI (search box + buttons in the body)
    function bindSearchUI() {
      const si = bodyEl.querySelector('input[type="text"]');
      const sbs = bodyEl.querySelectorAll('.win-btn');
      if (si) {
        si.addEventListener("keydown", function handler(e) {
          if (e.key === "Enter") doSearch(si.value);
        });
      }
      sbs.forEach(function(b) {
        if (b.textContent.trim() === "Google 搜索" || b.textContent.trim() === "手气不错") {
          b.addEventListener("click", function() {
            const inp = bodyEl.querySelector('input[type="text"]');
            if (inp) doSearch(inp.value);
          });
        }
      });
    }

    bindSearchUI();

    function doSearch(query) {
      var q = (query || "").trim();
      if (!q) {
        // back to homepage
        bodyEl.innerHTML = originalBodyHTML;
        bodyEl.style.cssText = "padding:0;overflow-y:auto;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:360px";
        bindSearchUI();
        return;
      }
      if (q.includes("马勇") || q.includes("my6014")) {
        bodyEl.innerHTML = aboutMeSearchResult();
      } else if (q.startsWith("http://") || q.startsWith("https://")) {
        bodyEl.innerHTML = '<div style="padding:40px;text-align:center"><p style="font-size:14px;color:#666">正在导航到 <strong>' + q + '</strong>...</p><p style="font-size:12px;color:#999">（这是模拟浏览器，无法真正跳转哦）</p></div>';
      } else {
        bodyEl.innerHTML = '<div style="padding:40px;text-align:center"><p style="font-size:14px;color:#666">关于 <strong>' + q + '</strong> 的搜索结果：</p><p style="font-size:12px;color:#999">（模拟浏览器，仅支持搜索"马勇"）</p></div>';
      }
      bodyEl.style.cssText = "padding:16px;overflow-y:auto;background:#fff;display:block;min-height:360px";
    }

    // Address bar "转到" button
    var goBtn = Array.from(winNode.querySelectorAll(".win-btn")).find(function(b) {
      return b.textContent.trim() === "转到" && !b.closest(".window-body");
    });
    if (goBtn) {
      goBtn.addEventListener("click", function() {
        if (addrInput) doSearch(addrInput.value);
      });
    }

    // Enter on address bar
    if (addrInput) {
      addrInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") doSearch(addrInput.value);
      });
    }

    // Click Google logo to go back to homepage
    var logoEl = bodyEl.querySelector('div[style*="text-align:center"]');
    if (logoEl) {
      var logoText = logoEl.querySelector('div[style*="font-size:48px"]');
      if (logoText) {
        logoText.style.cursor = "pointer";
        logoText.title = "返回首页";
        logoText.addEventListener("click", function() { doSearch(""); });
      }
    }
  }

  function aboutMeSearchResult() {
    return `
<div style="width:100%;max-width:600px;margin:0 auto">
  <div style="font-size:11px;color:#666;margin-bottom:12px">找到约 1 条结果，用时 0.01 秒</div>

  <!-- Main result -->
  <div style="margin-bottom:20px">
    <div style="font-size:13px;color:#1a0dab;cursor:pointer;text-decoration:underline;font-weight:bold">https://my6014.github.io/my_site/</div>
    <div style="font-size:18px;color:#1a0dab;cursor:pointer;font-weight:bold;margin:4px 0">马勇 — 前端开发 / 测试开发 | 北京交通大学</div>
    <div style="font-size:13px;color:#555;line-height:1.5">
      马勇，北京交通大学软件工程专业在读本科生，热爱前端开发与软件测试。有丰富的 React / Next.js / TypeScript 项目经验，参与过<b>轨道交通仿真系统 MetroSim</b>、<b>AI方言识别平台 DialectMaster</b>、<b>Smart Resume 智能求职助手</b>等多个项目。
    </div>
  </div>

  <!-- Quick info cards -->
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
    <div style="flex:1;min-width:140px;padding:8px 12px;background:#f8f8ff;border:1px solid #c0c0ff;font-size:12px">
      <div style="font-weight:bold;color:#000080">&#x1F393; 教育背景</div>
      <div style="margin-top:4px">北京交通大学</div>
      <div style="color:#666">软件工程 · 2023-2027</div>
    </div>
    <div style="flex:1;min-width:140px;padding:8px 12px;background:#f8fff8;border:1px solid #c0ffc0;font-size:12px">
      <div style="font-weight:bold;color:#000080">&#x1F4CD; 所在地</div>
      <div style="margin-top:4px">北京市海淀区</div>
    </div>
  </div>

  <!-- Contact -->
  <div style="font-size:12px;color:#555;margin-bottom:8px">
    <div style="font-size:13px;font-weight:bold;color:#1a0dab;cursor:pointer;margin-bottom:4px">联系方式</div>
    &#x1F4E7; 1806369472@qq.com &nbsp;&nbsp; &#x1F4F1; 133-8955-4545 &nbsp;&nbsp; &#x1F40D; github.com/my6014
  </div>

  <!-- Skills -->
  <div style="font-size:12px;color:#555;margin-bottom:8px">
    <div style="font-size:13px;font-weight:bold;color:#1a0dab;cursor:pointer;margin-bottom:4px">专业技能</div>
    <span style="background:#e8e8ff;padding:2px 6px">React</span>
    <span style="background:#e8ffe8;padding:2px 6px">Next.js</span>
    <span style="background:#ffe8e8;padding:2px 6px">TypeScript</span>
    <span style="background:#fff8e8;padding:2px 6px">Vue</span>
    <span style="background:#f0e8ff;padding:2px 6px">Python</span>
    <span style="background:#ffe8ff;padding:2px 6px">FastAPI</span>
    <span style="background:#e8ffe8;padding:2px 6px">Jest / Cypress</span>
  </div>
</div>`;
  }

  // ============================================
  //  Shutdown & Restart
  // ============================================

  function doShutdown() {
    // Minimize all windows
    Object.values(windows).forEach((win) => {
      win.node.classList.add("minimized");
      win.node.classList.remove("focused");
    });
    focusedWindow = null;
    shutdownOverlay.classList.remove("hidden");
  }

  function restart() {
    shutdownOverlay.classList.add("hidden");
    // Close all windows
    Object.keys(windows).forEach((app) => {
      const win = windows[app];
      if (win.taskbarBtn) win.taskbarBtn.remove();
      win.node.remove();
    });
    windows = {};
    focusedWindow = null;
    zIndexCounter = 100;
    // Reset DOS
    dosCwd = "C:\\WINDOWS";
    dosHistory = [];
    dosHistoryIdx = -1;
  }

  // ============================================
  //  Boot
  // ============================================

  init();
  console.log("%c 马勇的个人主页 %c %c Type 'help' in DOS for commands! ",
    "background:#000080;color:#fff;padding:2px 6px;font-family:monospace",
    "",
    "color:#666;font-family:monospace");
})();
