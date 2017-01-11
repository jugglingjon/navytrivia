var $categories,
	$globalFadeTime=500,
	$currentCategory,
	$gameScore=0,
	$gameBonusScore=0,
	$gameCorrectScore=0,
	$gameCorrectCount=0,
	$currentQuestion=0,
	$gameLength=5,
	$questionTime=10000,
	$answerDisplayDelay=750,
	$bonusBuffer=3000,
	$correctScore=1000,
	$bonusScore=1000,
	$gameData=[],
	$localKey='navyTriviaData';

var $startTime,
	$questionTimer,
	$textTimer;

// ====================================
// 				UTILITIES
// ====================================

//array shuffle function
function shuffle(a) {
	var j, x, i;
	for (i = a.length; i; i--) {
		j = Math.floor(Math.random() * i);
		x = a[i - 1];
		a[i - 1] = a[j];
		a[j] = x;
	}
}

// ====================================
// 				TIMER
// ====================================

//Timer functions
function startQuestionTimer(){
	//save current time
	$startTime=Date.now();

	//reset timer bar position and begin animation
	$('.game-timer-bar-inner').animate({
		width:'0%'
	},$questionTime,'linear');

	$('.game-timer-time').text($questionTime/1000);
	$textTimer= setInterval(function(){
		$('.game-timer-time').text($('.game-timer-time').text()-1);
	},1000);

	//after question time expires
	$questionTimer=setTimeout(function(){
		//expose answers
		$('.game-answers').addClass('clicked');
		
		//clone answers and question for display later
		cloneGameData();

		clearInterval($textTimer);

		advanceGame();
	},$questionTime);

}

//returns current timer number in ms
function reportQuestionTimer(){
	var elapsedTime=Date.now()-$startTime;
	return elapsedTime;
}



// ====================================
// 				SCREEN CONTROL
// ====================================



//changes to targeted screen
//callback object: {before:<callback before fadein begins>, after: <callback after faded in>}
function changeScreen(screenClass, callbackObj){

	var elementsToFade=$('.screen:not(.'+screenClass+')');
	var fadeCount=elementsToFade.length;

	elementsToFade.fadeOut($globalFadeTime, function(){
		if(--fadeCount>0) return;

		if(callbackObj&&callbackObj.before){
			callbackObj.before();
		}
		
		$('.'+screenClass).fadeIn($globalFadeTime,function(){
			if(callbackObj&&callbackObj.after){
				callbackObj.after();
			}
		});
	});
}


// ====================================
// 				STORAGE
// ====================================

//updates localhost data after change
function updateLocalData(){
	localStorage[$localKey]=JSON.stringify($categories);
}

//load local data if available
function loadData(){
	if(localStorage[$localKey]){
		var localCategories=JSON.parse(localStorage[$localKey]);
		init(localCategories);
	}
	else{
		//read json data file and initiate
		$.getJSON('categories.json', function(data){
			init(data.categories);
		});
	}
}

// ====================================
// 				GAME
// ====================================

//clone game data for display at end
function cloneGameData(){
	$gameData.push($('.game-data').clone());
}

//game end
function endGame(){

	//total scores
	$gameScore=$gameBonusScore+$gameCorrectScore;

	//render end screen
	$('.correct-score').text($gameCorrectCount + '/' + $gameLength +' Correct: '+ $gameCorrectScore);
	$('.bonus-score').text('Time Bonus: '+ $gameBonusScore);
	$('.end-score').text('Score: '+ $gameScore);
	$('.end-category').text($categories[$currentCategory].title);
	
	//append game data to history div
	$('.end-history').empty();
	$.each($gameData,function(){
		this.appendTo('.end-history');
	});

	//save game data
	$categories[$currentCategory].lastScore=$gameScore;
	if($categories[$currentCategory].highScore<$gameScore){
		$categories[$currentCategory].highScore=$gameScore;
	}
	$categories[$currentCategory].cumulativeScore+=$gameScore;
	$categories[$currentCategory].played++;

	updateLocalData();

	//nav to end screen and start flickity when shown
	changeScreen('screen-end',{
		after:function(){
			$('.end-history').flickity({
				prevNextButtons:false,
			});

			$('.end-history').animate({opacity:'1'});
		}
	});
}

//advance game to next question or end
function advanceGame(){
	//after delay, save answer data for later display, reset and proceed
	window.setTimeout(function(){
		cloneGameData();
		$('.screen-game').fadeOut($globalFadeTime,function(){
			
			//after faded out, clean up game screen for next question
			$('.game-timer-time').text($questionTime/1000);
			$('.game-timer-bar-inner').css('width','100%');
			$('.game-answers').removeClass('clicked');
			if($currentQuestion<($gameLength-1)){
				$currentQuestion++;
				loadQuestion($currentQuestion);
			}
			else{
				endGame();
			}
			
		});
	},$answerDisplayDelay);
}

//loads specified question and options into question screen
function loadQuestion(question){

	//get current question
	var currentQuestion=$categories[$currentCategory].questions[question];

	//populate question text
	$('.game-category').text($categories[$currentCategory].title);
	$('.game-question').text(currentQuestion.question);

	//clear answer space and populate with answers
	$('.game-answers').empty();
	$.each(currentQuestion.answers,function(){
		var newAnswer=$('<a href="#" class="answer">'+this.answer+'</a>');
		if(this.correct){
			newAnswer.addClass('correct');
		}
		newAnswer.appendTo('.game-answers');
	});

	//set dot colors
	$('.game-progress-dot').removeClass('current past').eq(question).addClass('current');
	$('.game-progress-dot:lt('+question+')').addClass('past');

	//fade in game screen, and begin timer
	$('.screen-game').fadeIn($globalFadeTime,function(){
		
		startQuestionTimer();

		//when answer clicked
		$('.answer').click(function(){
			
			//add clicked classes for colors
			$(this).addClass('clicked');
			$('.game-answers').addClass('clicked');

			//freeze answer screen: stop timers, disable click handler, stop animations
			clearInterval($textTimer);
			$('.answer').off('click');
			var answerTime=reportQuestionTimer();
			window.clearTimeout($questionTimer);
			$('.game-timer-bar-inner').stop();
			
			//if correct, calculate score bonus
			if($(this).hasClass('correct')){			

				//iterate correct count
				$gameCorrectCount++;

				//add correct score bonus
				$gameCorrectScore+=$correctScore;

				//add time bonus
				var answerBonus=0;
				if(answerTime<=$bonusBuffer){
					answerBonus=$bonusScore;
				}
				else if(answerTime>$bonusBuffer&&answerTime<=$questionTime){
					answerBonus=Math.floor(((($questionTime-$bonusBuffer)-(answerTime-$bonusBuffer))/($questionTime-$bonusBuffer))*$bonusScore);	
				}
				$gameBonusScore+=answerBonus;

				//mark correct in data, and update local
				currentQuestion.complete=true;
				updateLocalData();
			}
			else{
				//incorrect response
			}

			advanceGame();
		});
	});

	
}

//shuffles questions and initiates game
function playGame(){

	//zero out game progress variables
	$currentQuestion=0;
	$gameScore=0;
	$gameCorrectCount=0;
	$gameCorrectScore=0;
	$gameBonusScore=0;
	$gameData=[];
	$('.game-timer-time').text($questionTime/1000);

	//setup game dots
	$('.game-progress-dots').empty();
	for(var i=0;i<$gameLength;i++){
		$('.game-progress-dots').append($('<div class="game-progress-dot"></div>'));
	}

	//shuffle questions and begin game
	shuffle($categories[$currentCategory].questions);
	loadQuestion($currentQuestion);
}


// ====================================
// 				CATEGORIES
// ====================================

//populates categories list with fresh data
function populateCategories(){

	//empty existing
	$('.categories-list,.modal-categories-list').empty();
	
	//for each category
	$.each($categories,function(index){
		var category=this,
			completeQuestions=0;

		//count complete and calculate percentage
		$.each(this.questions,function(){
			if(this.complete){
				completeQuestions++;
			}
		});
		var completePercentage=completeQuestions/category.questions.length*100;

		//build button on categories screen
		var newCategory='<a href="#" class="category" data-categoryIndex="'+index+'">'+
		'<div class="category-image-wrapper">'+
		'<img src="categories/'+this.slug+'.png">'+
		'</div>'+
		'<span class="category-title">'+this.title+'</span>'+
		'<div class="category-progress"><div class="category-progress-inner" style="width:'+completePercentage+'%"></div></div>'+
		'</a>';

		//append to field
		$(newCategory).appendTo('.categories-list');

		//build modal category
		var newModalCategory='<div class="modal-category">'+
			'<div class="category-image-wrapper">'+
				'<img src="categories/'+this.slug+'.png">'+
			'</div>'+
			'<h2 class="category-title">'+this.title+'</h2>'+
			'<p>'+this.description+'</p>'+
			'<span>Questions Completed</span>'+
			'<div class="category-progress"><div class="category-progress-inner" style="width:'+completePercentage+'%"></div></div>'+
			'<div class="modal-category-stats">'+
				'<div class="modal-category-stat">'+this.played+'</div>'+
				'<div class="modal-category-stat">'+this.highScore+'</div>'+
				'<div class="modal-category-stat">'+this.lastScore+'</div>'+
			'</div>'+
			'<a href="#" data-categoryIndex="'+index+'" class="modal-category-play">Play</a>'+
		'</div>';

		//append to field
		$(newModalCategory).appendTo('.modal-categories-list');

		
	});
}




// ====================================
// 				INIT AND HANDLERS
// ====================================

function init(data){

	//define categories from data, populate first screen
	$categories=data;
	populateCategories();
	
}

$(document).ready(function(){

	loadData();

	//when category button is clicked, open modal and init flickity to that index
	$('.categories-list').on('click','.category',function(){
		var clickedIndex=parseInt($(this).attr('data-categoryIndex'));
		$('#categoriesModal').modal().one('shown.bs.modal', function () {
			$('.modal-categories-list').flickity({
				prevNextButtons:false,
				pageDots:false,
				initialIndex:clickedIndex
			});
			$('.modal-categories-list').animate({opacity:'1'},$globalFadeTime);
		});
	});

	//on categories modal close, reset flickity
	$('#categoriesModal').on('hidden.bs.modal', function () {
		$('.modal-categories-list').flickity('destroy');
		$('.modal-categories-list').css('opacity','0');
	});

	//When play button clicked
	$('body').on('click','.modal-category-play',function(){
		$('#categoriesModal').modal('hide');
		$currentCategory=parseInt($(this).attr('data-categoryIndex'));
		changeScreen('screen-game',{before:playGame});
	});

	//back to categories after
	$('body').on('click','.btn-gameover',function(){
		changeScreen('screen-categories',{before: function(){
			$('.end-history').flickity('destroy').empty().css('opacity','0');
			populateCategories();}});
	});

	//try again button, restart game
	$('body').on('click','.btn-restart',function(){
		changeScreen('screen-game',{before:function(){
			$('.end-history').flickity('destroy').empty().css('opacity','0');
			playGame();
		}});
	});
});