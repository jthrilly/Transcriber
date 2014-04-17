var Transcriber = function (options) {

	// Globals
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


	// Helpers

	function formatTime(seconds) {
		// Format microseconds into minutes and seconds
		minutes = Math.floor(seconds / 60);
		minutes = (minutes >= 10) ? minutes : "0" + minutes;
		seconds = Math.floor(seconds % 60);
		seconds = (seconds >= 10) ? seconds : "0" + seconds;
		return minutes + ":" + seconds;
	}
	
	function isNumber(n) {
		// is n a number? return bool
 		return !isNaN(parseFloat(n)) && isFinite(n);
	}

	Array.contains = function (arr, key) {
	    for (var i = arr.length; i--;) {
	        if (arr[i] === key) return true;
	    }
	    return false;
	};

	Array.add = function (arr, key, value) {
	    for (var i = arr.length; i--;) {
	        if (arr[i] === key) return arr[key] = value;
	    }
	    this.push(key);
	};

	Array.prototype.remove = function(index) {
	  var idx = index;
	  if (idx != -1) {
	      return this.splice(idx, 1); // The second parameter is the number of elements to remove.
	  }
	  return false;
	}

	Storage.prototype.setObject = function(key, obj) {
	    return this.setItem(key, JSON.stringify(obj))
	}
	Storage.prototype.getObject = function(key) {
	    return JSON.parse(this.getItem(key))
	}

    // Initialise app
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
		$('.participant-buttons').append('<div class="checkbox"><label><input type="checkbox" checked>Automatically switch</label></div>');
		$('input:radio:first').prop("checked", true); 
		$('.individual:first').addClass('active-individual');

		$('.list-group').sortable({cancel: ':input,button,[contenteditable]', handle:'.drag-handle'});
    	// $( ".list-group" ).disableSelection();


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
			var startTime = interviewData[index] ? interviewData[index].startTime : 0;
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
		        app.updateUtterance($(this).parent().data('index'));
		        $('.current-utterance').focus();
		    }
		});

		// Update existing utterance when enter key pressed
		$(document.body).on('click', '.participant-heading' ,function(){
	        if ($(this).html() == appOptions.participants[0]) {
	        	$(this).html(appOptions.participants[1]);
	        } else {
	        	$(this).html(appOptions.participants[0]);
	        }
	        app.updateUtterance($(this).parent().data('index'));
	        $('.current-utterance').focus();
		});

		// Remove utterance
		$(document.body).on('click', '.remove-utterance' ,function(){
	        app.removeUtterance($(this).parent().data('index'));
	        $('.current-utterance').focus();
		});

		$(document.body).on('mouseenter', '.list-group-item' ,function(){
			$(this).children('.remove-utterance').stop().transition({ opacity: 1}, 800, 'ease');
		});
		$(document.body).on('mouseleave', '.list-group-item' ,function(){
			$(this).children('.remove-utterance').stop().transition({ opacity: 0}, 500, 'ease');
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

		app.loadData();
		init = true;

	};

	this.saveData = function() {
		console.log("Saving.");
		var data = app.getInterviewData();
		// console.log(data);
		localStorage.setObject('data', data); 
	};

	this.setData = function(data) {
		interviewData = data;
	}

	this.loadData = function() {
		loadedData = localStorage.getObject('data') || {};
		app.resetInterview();
		 $.each(loadedData, function (index, value) {
		 	var properties = {};
			properties.participant = {};
			properties.participant = loadedData[index].participant;
			properties.utterance = {};
			properties.utterance = loadedData[index].utterance;
			properties.startTime = {};
			properties.startTime = loadedData[index].startTime;
			properties.submitTime = {};
			properties.submitTime = loadedData[index].submitTime;
            app.addUtterance(properties);
            // console.log(properties);
        });
	};

	this.downloadData = function() {
		var filename = 'interview.json';
		var text = JSON.stringify(app.getInterviewData(), undefined, 2); // indentation level = 2;
	    var pom = document.createElement('a');
	    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	    pom.setAttribute('download', filename);
	    pom.click();		
	}

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
		app.saveData();

	}

	this.addUtterance = function(data) {
		interviewData.push(data);
		var counter = interviewData.length-1;
		var newItem = $('<a class="list-group-item" style="opacity:0;position:relative;top:200px" data-index="'+counter+'">').html('<div class="drag-handle" style="background:#eee;height:45px;width:15px;float:left;margin-right:10px;cursor:move"></div><h4 class="list-group-item-heading participant-heading">'+data.participant+'</h4> <h5 contenteditable class="utterance-time">'+formatTime(data.startTime)+'-'+formatTime(data.submitTime)+'</h5><button type="button" class="btn btn-link btn-lg remove-utterance"><span class="glyphicon glyphicon-remove-circle"></span></button><div contenteditable class="utterance">'+data.utterance+'</div></a>');
		$('.list-group').append(newItem);
		newItem.transition({ opacity: 1,top:0,background:'rgb(255, 249, 182)'}, 800, 'ease');
		$('body, html').stop().animate({ scrollTop: newItem.offset().top },1500);
		timeout = setTimeout(function(){
    		newItem.transition({ background:'#fff'}, 1800, 'ease');
		}, 1500);
		app.saveData();
	};

	this.updateUtterance = function(index) {
		var element = $('*[data-index="'+index+'"]')
		interviewData[index].utterance = $(element).children('.utterance').html();
		interviewData[index].participant = $(element).children('.participant-heading').html();
		app.saveData();
        $(element).transition({background:'rgb(232, 255, 235)'}, 800, 'ease');
		timeout = setTimeout(function(){
			$(element).transition({ background:'#ffffff'}, 1800, 'ease');
			}, 1500);
	};

	this.removeUtterance = function(index) {
		var element = $('*[data-index="'+index+'"]');
		interviewData.remove(index);
		timeout = setTimeout(function(){
			$(element).transition({background:'Tomato',opacity: 0 }, function () { $(this).remove(); });
			}, 500);
		app.saveData();

	};

	this.loadAudio = function(files) {
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
		if (audioPlayer.readyState > 2) {
			audioPlayer.currentTime = time;			
		}

		startTime = currentTime || time;

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
