class YouTubeMusicManager {
  constructor(fadeDuration = 5000) {
    this.fadeDuration = fadeDuration;
    this.volumeSteps = 20;
    this.player1 = null;
    this.player2 = null;
    this.current = null;
    this.next = null;
    this.readyCount = 0;
	  this.isPlaying = false;

    window.onYouTubeIframeAPIReady = this._onYouTubeAPIReady.bind(this);
  }

  _onYouTubeAPIReady() {
    this.player1 = new YT.Player('yt-player-1', {
      width: '100%',
      height: '100%',
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0
      },
      events: {
        'onReady': () => this._onPlayerReady()
      }
    });

    this.player2 = new YT.Player('yt-player-2', {
      width: '100%',
      height: '100%',
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0
      },
      events: {
        'onReady': () => this._onPlayerReady()
      }
    });
  }

  _onPlayerReady() {
    this.readyCount++;
    if (this.readyCount === 2) {
      this.current = this.player1;
      this.next = this.player2;
      console.log("Both YouTube players are ready.");

      const _ytInput1 = document.getElementById('ytInput1');
      const _ytInput2 = document.getElementById('ytInput2');
  	  const _workVolSlider = document.getElementById('workVolume');
  	  const _breakVolSlider = document.getElementById('breakVolume');

      if (_ytInput1.value !== '') {
        const url = _ytInput1.value.trim();
        if (url) {
          ytManager.loadInput(url, 0);
  		  const volume = parseFloat(_workVolSlider.value);
	      ytManager.setVolumeForCurrent(volume);
        }
      }

      if (_ytInput2.value !== '') {
        const url = _ytInput2.value.trim();
        if (url) {
          ytManager.loadInput(url, 1);
          const volume = parseFloat(_breakVolSlider.value);
	      ytManager.setVolumeForCurrent(volume);
        }
      }
      this.stopAll();
    }
  }

	loadInput(url, slot = 0) {
	  const { type, id } = this._parseYouTubeURL(url);
	  const player = slot === 0 ? this.player1 : this.player2;

	  if (!player) {
	    alert("YouTube Player not ready yet!");
	    return;
	  }

	  if (type === 'video') {
	    player.loadVideoById(id); // <- use loadVideoById instead of cue to autoplay
	  } else if (type === 'playlist') {
	    player.loadPlaylist({ list: id }); // <- use loadPlaylist instead of cue
	  }

	  // If this is the current player and we were playing before, resume playback
	  const isCurrentSlot = (slot === 0 && this.current === this.player1) || (slot === 1 && this.current === this.player2);
	  if (isCurrentSlot && this.isPlaying) {
	    player.playVideo();
	  }
	}


  playCurrent() {
    if (this.current) {
      this.current.setVolume(100);
      this.current.playVideo();
      this.isPlaying = true;
    }
  }

    async crossfade() {
    if (!this.current || !this.next) return;

    const workVol = parseFloat(document.getElementById('workVolume').value) * 100;
    const breakVol = parseFloat(document.getElementById('breakVolume').value) * 100;

    const fromVol = this.current === this.player1 ? workVol : breakVol;
    const toVol = this.next === this.player1 ? workVol : breakVol;

    this.next.setVolume(0);
    this.next.playVideo();

    const steps = this.volumeSteps;
    const delay = this.fadeDuration / steps;

    for (let i = 0; i <= steps; i++) {
      const fadeOut = Math.round(fromVol * (1 - i / steps));
      const fadeIn = Math.round(toVol * (i / steps));
      this.current.setVolume(fadeOut);
      this.next.setVolume(fadeIn);
      await this._sleep(delay);
    }

    this.current.pauseVideo();
    [this.current, this.next] = [this.next, this.current];
  }

  stopAll() {
    if (this.player1) this.player1.stopVideo();
    if (this.player2) this.player2.stopVideo();
    this.isPlaying = false;
     this.current = this.player1;
     this.next = this.player2;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _parseYouTubeURL(url) {
    const videoMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const listMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);

    if (listMatch) return { type: 'playlist', id: listMatch[1] };
    if (videoMatch) return { type: 'video', id: videoMatch[1] };

    throw new Error("Invalid YouTube URL");
  }

  setVolumeForCurrent(volume) {
    if (this.current && typeof this.current.setVolume === 'function') {
      this.current.setVolume(Math.round(volume * 100));
    }
  }
}

const ytManager = new YouTubeMusicManager(4000);


const _ytInput1 = document.getElementById('ytInput1');
const _ytInput2 = document.getElementById('ytInput2');
let typingTimer;
const debounceDelay = 500; // milliseconds

_ytInput1.addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    const url = _ytInput1.value.trim();
    if (url) {
      ytManager.loadInput(url, 0);
    }
  }, debounceDelay);
});

_ytInput2.addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    const url = _ytInput2.value.trim();
    if (url) {
      ytManager.loadInput(url, 1);
    }
  }, debounceDelay);
});
