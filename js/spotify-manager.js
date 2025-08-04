class SpotifyMusicManager {
	constructor() {
		this.player1 = document.getElementById('spotify-player-1');
		this.player2 = document.getElementById('spotify-player-2');
		this.current = this.player1;
		this.next = this.player2;
		this.isPlaying = false;


		this._setupInputs();


		window.onSpotifyIframeApiReady = IFrameAPI => {
			const input1 = document.getElementById('spotifyInput1');
			let embedUrl1 = 'spotify:playlist:6zCID88oNjNv9zx6puDHKj';
			if (input1.value !== '') {
				input1.value = "https://open.spotify.com/playlist/6zCID88oNjNv9zx6puDHKj";

				embedUrl1 = this._getEmbedUrl(input1.value.trim());
			}



		  let element = document.getElementById('spotify-player-1');
		  let options = {
		  	width: 227,
		  	height: 152,
		  	// theme: "dark",
		    uri: embedUrl1,
		  };
		  let callback = EmbedController1 => { this.player1 = EmbedController1; };
		  IFrameAPI.createController(element, options, callback);


			const input2 = document.getElementById('spotifyInput2');
			let embedUrl2 = 'spotify:playlist:32CIUvdPXaAc4dZnYU0cz4';
			if (input2.value !== '') {
				input2.value = "https://open.spotify.com/playlist/32CIUvdPXaAc4dZnYU0cz4";
				 embedUrl2 = this._getEmbedUrl(input2.value.trim());
			}
		  let element2 = document.getElementById('spotify-player-2');
		  let options2 = {
		  	width: 227,
		  	height: 152,
		  	// theme: "dark",
		    uri: embedUrl2,
		  };
		  let callback2 = EmbedController2 => { this.player2 = EmbedController2; };
		  IFrameAPI.createController(element2, options2, callback2);
		};

	}

	_setupInputs() {
		const input1 = document.getElementById('spotifyInput1');
		const input2 = document.getElementById('spotifyInput2');
		const debounce = (fn, delay) => {
			let timer;
			return (...args) => {
				clearTimeout(timer);
				timer = setTimeout(() => fn.apply(this, args), delay);
			};
		};

		input1.addEventListener('input', debounce(() => this.loadInput(input1.value.trim(), 0), 500));
		input2.addEventListener('input', debounce(() => this.loadInput(input2.value.trim(), 1), 500));
	}

	loadInput(url, slot = 0) {
		const embedUrl = this._getEmbedUrl(url);
		if (!embedUrl) return;

		if (slot === 0) {
			this.player1.loadUri(embedUrl);
		} else {
			this.player2.loadUri(embedUrl);
		}
	}

	_getEmbedUrl(url) {
		const match = url.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
		if (!match) return null;

		const type = match[1];
		const id = match[2];

		return `spotify:${type}:${id}`;
	}

	playWork() {
		this.player1.resume();
		this.current = this.player1;
		this.next = this.player2;
		this.isPlaying = true;
	}

	playBreak() {
		this.player2.resume();
		this.current = this.player2;
		this.next = this.player1;
		this.isPlaying = true;
	}

	async crossfade() {
        if (!this.current || !this.next) return;

        const workVol = parseFloat(document.getElementById('workVolume').value) * 100;
        const breakVol = parseFloat(document.getElementById('breakVolume').value) * 100;

        const fromVol = this.current === this.player1 ? workVol : breakVol;
        const toVol = this.next === this.player1 ? workVol : breakVol;

        // this.next.setVolume(0);
        this.next.resume();

        const steps = this.volumeSteps;
        const delay = this.fadeDuration / steps;

        for (let i = 0; i <= steps; i++) {
            const fadeOut = Math.round(fromVol * (1 - i / steps));
            const fadeIn = Math.round(toVol * (i / steps));
            // this.current.setVolume(fadeOut);
            // this.next.setVolume(fadeIn);
            await this._sleep(delay);
        }

        this.current.pause();
        [this.current, this.next] = [this.next, this.current];
	}

	stopAll() {
		this.player1.pause();
		this.player1.seek(0);
		this.player2.pause();
		this.player2.seek(0);


		// this.player1.src = '';
		// this.player2.src = '';
		this.isPlaying = false;
	}
}

const spotifyManager = new SpotifyMusicManager();
