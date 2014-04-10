var Transcriber = function (options) {
	var app = this;
	var init = false;
	var audioPlayer = document.getElementById("audio-player");
	var interviewData = [];
	var playing = false;
	var startTime;
	var timeout;
	var defaultOptions = {
		'debug': true,
		'participants':['Participant 1','Participant 2'],
		'audio': ''
	};

	var appOptions = options || defaultOptions;

	function formatTime(seconds) {
		minutes = Math.floor(seconds / 60);
		minutes = (minutes >= 10) ? minutes : "0" + minutes;
		seconds = Math.floor(seconds % 60);
		seconds = (seconds >= 10) ? seconds : "0" + seconds;
		return minutes + ":" + seconds;
	}
	
	function isNumber(n) {
 		return !isNaN(parseFloat(n)) && isFinite(n);
	}


	this.init = function() {
		$('#selectedFile').hide();
		$('.open-music').on('click',function(){
			$('#selectedFile').trigger('click');
		});
		$('#speedSlider').slider({
			min: 0.1,
			max: 2,
			step: 0.1,
			value: 1,
			tooltip: 'hide'
		}).on('slide', function(slideEvt) {
			if (isNumber(slideEvt.value[0])) {
				app.adjustPlaySpeed(slideEvt.value[0]);
				// console.log("valueslideEvt.value[0]);
			}		
		});
		$(".time").html('00:00/'+formatTime(audioPlayer.duration));

		$("#audio-player").bind('timeupdate', function(){
			var time = formatTime(audioPlayer.currentTime);
			$('.time').html(time+'/'+formatTime(audioPlayer.duration));
		});
		$("#audio-player").bind('durationchange', function(){
			var time = formatTime(audioPlayer.currentTime);
			$('.time').html(time+'/'+formatTime(audioPlayer.duration));
		});


		$.each(appOptions.participants, function(value, index) {
				$('.participant-buttons').append('<button class="btn btn-primary btn-block individual">'+index+'</button>');
				$('.radio').append('<label><input type="radio" name="participantRadio" value="'+index+'">'+index+'</label>');				
		});
		$('input:radio:first').prop("checked", true); 
		$('.individual:first').addClass('active-individual');

		// Offset the body with the footer height so no elements are unintentionally hidden behind it

		var footerHeight = $('footer').outerHeight();
		var navHeight = $('nav').outerHeight()+15;
		$('body').css({'marginBottom':footerHeight, 'marginTop':navHeight});

		// Key bindings
		$(document).on("keydown", function (e) {

    		// Prevent accidental backspace navigation
    		if (e.which === 8 && !$(e.target).is("input, textarea, div")) {
        		e.preventDefault();
    		}
    		// switch participant by pressing tab
    		if (e.which == 9) {
				e.preventDefault();
				app.toggleParticipant();       			    			
    		}

    		// Shift + space = toggle play/stop
    		if (e.which == 32) {
	    		if(e.shiftKey) {
	    			e.preventDefault();
		        	e.stopImmediatePropagation();
	    			app.togglePlay();
	    		}
	    	}
		});

		$(document.body).on('click', '.list-group-item' ,function(){
			var index = $(this).data('index');
			var startTime = interviewData[index].startTime;
			app.seekTo(startTime);

		});

		$(document).on("keypress", function (e) {
			if (e.which == 60) {
				e.preventDefault();
		        e.stopImmediatePropagation();
				app.Rewind();
			}
			if (e.which == 62) {
				e.preventDefault();
		        e.stopImmediatePropagation();
				app.Forward();
			}
		});

		// Update existing utterance when enter key pressed
		$(document.body).on('keypress', '.utterance' ,function(){
		    if (event.which == 13) {
		        event.preventDefault();

		        app.updateUtterance($(this));
		        $('.current-utterance').focus();
		        var element = $(this);
		        $(element).parent().transition({background:'rgb(232, 255, 235)'}, 800, 'ease');
				timeout = setTimeout(function(){
    				$(element).parent().transition({ background:'#ffffff'}, 1800, 'ease');
					}, 1500);
		    	}
		});

		// Submit the form by pressing enter inside the main textarea
		$(".current-utterance").keypress(function(event) {
		    if (event.which == 13) {
		        event.preventDefault();
		        event.stopImmediatePropagation();
		        $("form").submit();
		    }
		}).focus();

		$('form').on('submit', function(e) {
        	e.preventDefault();
        	e.stopImmediatePropagation();			
			var data = {};
			data.participant = {};
			data.participant = $('input[name=participantRadio]:checked').val();
			data.utterance = {};
			data.utterance = $('.current-utterance').val();
			data.startTime = {};
			startTime = startTime || 0;
			data.startTime = startTime;
			data.submitTime = {};
			data.submitTime = audioPlayer.currentTime;	
        	app.addUtterance(data);
        	startTime = audioPlayer.currentTime;
        	// clear the textarea
        	$('.current-utterance').val('');
        	//switch participant
			app.toggleParticipant();   
    	});

		init = true;

	};

	this.toggleParticipant = function() {
		$('input[type="radio"]').not(':checked').prop("checked", true);
		$('.individual').toggleClass('active-individual');
	}

	this.getInterviewData = function() {
		return interviewData;
	}

	this.resetInterview = function() {
		currentTime = 0;
		interviewData = [];
		startTime = 0;
		app.Stop();
		audioPlayer.src = null;
		$('.time').html('00:00/00:00');
		$(".list-group").empty();
		$('.current-utterance').focus();

	}

	this.addUtterance = function(data) {
		interviewData.push(data);
		var counter = interviewData.length-1;
		var newItem = $('<a class="list-group-item" style="opacity:0;position:relative;top:200px" data-index="'+counter+'">').html('<h4 class="list-group-item-heading">'+data.participant+' <small>'+formatTime(data.startTime)+'-'+formatTime(data.submitTime)+'</small></h4><div contenteditable class="utterance">'+data.utterance+'</div></a>');
		$('.list-group').append(newItem);
		newItem.transition({ opacity: 1,top:0,background:'rgb(255, 249, 182)'}, 800, 'ease');
		$('body, html').stop().animate({ scrollTop: newItem.offset().top },1500);
		timeout = setTimeout(function(){
    		newItem.transition({ background:'#fff'}, 1800, 'ease');
		}, 1500);
	};

	this.updateUtterance = function(element) {
		interviewData[$(element).parent().data('index')].utterance = $(element).html();

	};

	this.removeUtterance = function(data) {

	};

	this.loadAudio = function(files) {
		app.resetInterview();
        var file = (window.webkitURL ? webkitURL : URL).createObjectURL(files[0]); 
        audioPlayer.src = file;
        audioPlayer.load();
		var time = formatTime(audioPlayer.currentTime);
		$('.current-utterance').focus();


	};

	this.togglePlay = function() {
		if(playing) {
			app.Pause();
		} else {
			app.Play();
		}
	}

	this.adjustPlaySpeed = function(speed) {
		audioPlayer.playbackRate = speed;
	}

	this.Play = function() {
		console.log('playing');
		audioPlayer.play();
		$(".play span").removeClass("glyphicon-play").addClass("glyphicon-pause");
		playing = true;
	};

	this.Stop = function() {
		console.log('stopping');
		audioPlayer.pause();
		audioPlayer.currentTime = 0;
		playing = false;
	};

	this.Pause = function() {
		audioPlayer.pause();
		$(".play span").removeClass("glyphicon-pause").addClass("glyphicon-play");
		playing = false;
	};

	this.Forward = function() {
		audioPlayer.currentTime+=5;
	};

	this.Rewind = function() {
		audioPlayer.currentTime-=5;
	};

	this.seekTo = function(time) {
		audioPlayer.currentTime = time;
	}

	app.init();
};

window.onload = function() {

    window.transcriber = new Transcriber({
        'debug': true,
        'participants': ['Joshua Melville','Martin Farran'],
        'audio': 'test.wav'
    });
};
