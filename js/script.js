// Streaming Pomodoro with Crossfade, Auto-Rounds, Long Breaks, and State Persistence
(() => {

    function isYouTubeTabActive() {
        const ytTab = document.querySelector('#youtube');
        return ytTab && ytTab.classList.contains('active');
    }


    document.addEventListener('DOMContentLoaded', function() {
        const themeToggleWrapper = document.getElementById('themeToggleWrapper');
        const themeIcon = document.getElementById('themeIcon');
        const body = document.body;

        function updateThemeIcon() {
            if (themeIcon) {
                themeIcon.textContent = body.classList.contains('dark-mode') ? '🌙' : '☀️';
            }
        }

        // Load saved theme
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
        }

        updateThemeIcon();

        themeToggleWrapper.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
            updateThemeIcon();
        });
    });


    document.querySelectorAll('.card-header[data-bs-toggle="collapse"]').forEach(header => {
        const targetSelector = header.getAttribute('data-bs-target');
        const collapseElement = document.querySelector(targetSelector);
        const icon = header.querySelector('.collapse-icon');

        // Initialize icon based on collapse state on page load
        if (collapseElement.classList.contains('show')) {
            icon.textContent = '▼';
        } else {
            icon.textContent = '►';
        }

        // Listen for Bootstrap collapse events to toggle icon
        collapseElement.addEventListener('shown.bs.collapse', () => {
            icon.textContent = '▼';
        });

        collapseElement.addEventListener('hidden.bs.collapse', () => {
            icon.textContent = '►';
        });
    });


    const workDurationInput = document.getElementById('workDuration');
    const breakDurationInput = document.getElementById('breakDuration');
    const longBreakDurationInput = document.getElementById('longBreakDuration');
    const roundsUntilLongBreakInput = document.getElementById('roundsUntilLongBreak');
    const workTrackInput = document.getElementById('workTrack');
    const breakTrackInput = document.getElementById('breakTrack');
    const workVolSlider = document.getElementById('workVolume');
    const breakVolSlider = document.getElementById('breakVolume');
    const resetRoundsBtn = document.getElementById('resetRoundsBtn');

    const startBtn = document.getElementById('startBtn');
    const statusDiv = document.getElementById('status');
    const timerDiv = document.getElementById('timer');
    const preloadStatusDiv = document.getElementById('preloadStatus');

    const workAudio = new Audio();
    const breakAudio = new Audio();
    workAudio.crossOrigin = breakAudio.crossOrigin = 'anonymous';
    workAudio.loop = false;
    breakAudio.loop = false;

    let ctx = new AudioContext();
    const workSource = ctx.createMediaElementSource(workAudio);
    const breakSource = ctx.createMediaElementSource(breakAudio);
    const workGain = ctx.createGain();
    const breakGain = ctx.createGain();
    workSource.connect(workGain).connect(ctx.destination);
    breakSource.connect(breakGain).connect(ctx.destination);

    const crossfadeDuration = 5; // seconds

    let timerInterval = null;
    let crossfadeTimeout = null;

    let state = {
        mode: 'work',
        startTime: null,
        paused: true,
        roundCount: 0,
        workAudioPos: 0,
        breakAudioPos: 0
    };

    function saveState() {
        localStorage.setItem('pomodoroState', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const obj = JSON.parse(saved);
                Object.assign(state, obj);
            } catch {}
        }
    }

    let workPlaylist = [];
    let breakPlaylist = [];
    let workTrackIndex = 0;
    let breakTrackIndex = 0;

    workTrackInput.addEventListener('change', () => {
        workPlaylist = Array.from(workTrackInput.files);
        workTrackIndex = 0;
        if (workPlaylist.length > 0) {
            workAudio.src = URL.createObjectURL(workPlaylist[workTrackIndex]);
            if (state.mode === 'work' && !state.paused) {
                workAudio.play();
            }
        }
    });

    breakTrackInput.addEventListener('change', () => {
        breakPlaylist = Array.from(breakTrackInput.files);
        breakTrackIndex = 0;
        if (breakPlaylist.length > 0) {
            breakAudio.src = URL.createObjectURL(breakPlaylist[breakTrackIndex]);
            if ((state.mode === 'break' || state.mode === 'longBreak') && !state.paused) {
                breakAudio.play();
            }
        }
    });

    // Playlist looping logic
    workAudio.addEventListener('ended', () => {
        if (workPlaylist.length > 1) {
            workTrackIndex = (workTrackIndex + 1) % workPlaylist.length;
            workAudio.src = URL.createObjectURL(workPlaylist[workTrackIndex]);
            workAudio.play();
        }
    });

    breakAudio.addEventListener('ended', () => {
        if (breakPlaylist.length > 1) {
            breakTrackIndex = (breakTrackIndex + 1) % breakPlaylist.length;
            breakAudio.src = URL.createObjectURL(breakPlaylist[breakTrackIndex]);
            breakAudio.play();
        }
    });

    workVolSlider.addEventListener('input', () => {
        const volume = parseFloat(workVolSlider.value);
        if (state.mode === 'work') {
            if (isYouTubeTabActive()) {
                ytManager.setVolumeForCurrent(volume);
            } else {
                workGain.gain.value = volume;
            }
        }
    });

    breakVolSlider.addEventListener('input', () => {
        const volume = parseFloat(breakVolSlider.value);
        if (state.mode === 'break' || state.mode === 'longBreak') {
            if (isYouTubeTabActive()) {
                ytManager.setVolumeForCurrent(volume);
            } else {
                breakGain.gain.value = volume;
            }
        }
    });

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        if (!state.startTime) return;
        const elapsed = (Date.now() - state.startTime) / 1000;
        const duration = getCurrentDuration();
        const remaining = Math.max(0, duration - elapsed);
        document.title = `${formatTime(remaining)} - ${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}`;
        timerDiv.textContent = `${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)} - ${formatTime(remaining)}`;
        if (remaining <= crossfadeDuration && !crossfadeTimeout) {
            startCrossfade();
        }
    }

    function startTimer() {
        stopTimer();
        state.startTime = Date.now();
        timerInterval = setInterval(updateTimerDisplay, 500);
    }

    function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    function getCurrentDuration() {
        if (state.mode === 'longBreak') return parseInt(longBreakDurationInput.value) * 60;
        return (state.mode === 'work' ? parseInt(workDurationInput.value) : parseInt(breakDurationInput.value)) * 60;
    }

    function startCrossfade() {
        crossfadeTimeout = setTimeout(() => {
            if (isYouTubeTabActive()) {
                ytManager.crossfade().then(() => {
                    state.mode = state.mode === 'work' ? (
                        (state.roundCount + 1) % parseInt(roundsUntilLongBreakInput.value) === 0 ? 'longBreak' : 'break'
                    ) : 'work';

                    if (state.mode === 'work') {
                        state.roundCount++;
                    }

                    state.startTime = Date.now();
                    updateStatus();
                    saveState();
                    crossfadeTimeout = null;
                });
                return;
            }

            // Local audio crossfade
            if (state.mode === 'work') {
                state.workAudioPos = workAudio.currentTime;
                fadeOutAudio(workGain);
                fadeInAudio(breakAudio, breakGain, parseFloat(breakVolSlider.value), state.breakAudioPos);
                const roundsUntilLongBreak = parseInt(roundsUntilLongBreakInput.value);
                state.mode = (state.roundCount + 1) % roundsUntilLongBreak === 0 ? 'longBreak' : 'break';
            } else {
                state.breakAudioPos = breakAudio.currentTime;
                fadeOutAudio(breakGain);
                fadeInAudio(workAudio, workGain, parseFloat(workVolSlider.value), state.workAudioPos);
                state.mode = 'work';
                state.roundCount++;
            }

            saveState();
            state.startTime = Date.now();
            updateStatus();
            crossfadeTimeout = null;
        }, crossfadeDuration * 1000);
    }

    function fadeOutAudio(gainNode) {
        gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + crossfadeDuration);
    }

    function fadeInAudio(audioEl, gainNode, volume, startTime = 0) {
        audioEl.currentTime = startTime;
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + crossfadeDuration);
        audioEl.play();
    }

    function updateStatus() {
        const modeText = state.mode === 'longBreak' ? 'Long Break' : state.mode.charAt(0).toUpperCase() + state.mode.slice(1);
        const roundDisplay = `Round ${state.roundCount + 1}`;
        statusDiv.textContent = `Status: ${modeText} session (${roundDisplay})`;
    }

    function startPomodoro() {
        if (ctx.state === 'suspended') ctx.resume();

        resetRounds();
        if (isYouTubeTabActive()) {
            // YouTube mode
            if (!ytManager || !ytManager.current || !ytManager.next) {
                alert('Please make sure both YouTube links are loaded.');
                return;
            }

            ytManager.playCurrent();
            const volume = parseFloat(workVolSlider.value);
            ytManager.setVolumeForCurrent(volume);

            state.paused = false;
            state.startTime = Date.now();
            startTimer();
            updateStatus();
            saveState();
            startBtn.classList.add('d-none');
            resetRoundsBtn.classList.remove('d-none');
            return;
        }

        // Local file mode
        if (!workTrackInput.files[0] || !breakTrackInput.files[0]) {
            alert('Please select both work and break music tracks.');
            return;
        }

        workAudio.currentTime = state.workAudioPos || 0;
        breakAudio.currentTime = state.breakAudioPos || 0;

        workGain.gain.value = 0;
        breakGain.gain.value = 0;

        state.paused = false;

        if (state.mode === 'work') {
            workGain.gain.value = parseFloat(workVolSlider.value);
            workAudio.play();
        } else {
            breakGain.gain.value = parseFloat(breakVolSlider.value);
            breakAudio.play();
        }

        state.startTime = Date.now();
        startTimer();
        updateStatus();
        saveState();
        startBtn.classList.add('d-none');
        resetRoundsBtn.classList.remove('d-none');
    }

    function resetRounds() {
        state = {
            mode: 'work',
            paused: true,
            startTime: null,
            roundCount: 0,
            workAudioPos: 0,
            breakAudioPos: 0
        };
        saveState();
        updateStatus();
        statusDiv.textContent = 'Status: Not started';
        workAudio.pause();
        breakAudio.pause();
        timerDiv.textContent = "00:00"
        document.title = "Pomodoro 🎵⏱️";
        if (isYouTubeTabActive()) {
            ytManager.stopAll();
        }
        workTrackIndex = 0;
        breakTrackIndex = 0;
        startBtn.classList.remove('d-none');
        resetRoundsBtn.classList.add('d-none');
    }

    startBtn.addEventListener('click', startPomodoro);
    resetRoundsBtn.addEventListener('click', resetRounds);

    window.addEventListener('load', () => {
        loadState();
        statusDiv.textContent = 'Status: Not started';
        workTrackInput.value = ''
        breakTrackInput.value = ''
    });

})();