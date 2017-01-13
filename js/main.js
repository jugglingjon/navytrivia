var $data,
	$categories,
	$globalFadeTime=500,
	$currentCategory,
	$gameScore=0,
	$gameBonusScore=0,
	$gameCorrectScore=0,
	$gameCorrectCount=0,
	$gameFastAnswers=0,
	$fastAnswerTime=5000,
	$currentQuestion=0,
	$consecutiveGames=0,
	$gameLength=10,
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
// 				^UTILITIES
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

//randomize jquery object children
$.fn.randomize = function(selector){
    (selector ? this.find(selector) : this).parent().each(function(){
        $(this).children(selector).sort(function(){
            return Math.random() - 0.5;
        }).detach().appendTo(this);
    });

    return this;
};

// ====================================
// 				^TIMER
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

		//turn off click handlers for answers
		$('.answer').off('click');

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
// 				^SCREEN CONTROL
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
// 				^STORAGE
// ====================================

//updates localhost data after change
function updateLocalData(){
	localStorage[$localKey]=JSON.stringify($data);
}

//load local data if available
function loadData(reset){
	if(localStorage[$localKey]&&!reset){
		var localData=JSON.parse(localStorage[$localKey]);
		init(localData);
	}
	else{
		//read json data file and initiate
		if(reset){
			alert('Reseting Data');
			localStorage.removeItem($localKey);
			changeScreen('screen-categories',{before: populateCategories});
		}
		$.getJSON('categories.json', function(data){
			init(data);
		});
	}
}

// ====================================
// 				^ACHIEVEMENTS
// ====================================

//scan and process newly earned achievements
function processAchievements(callback){
	
	$('.modal-achievements-list').empty();
	$.each($data.achievements,function(){
		var criteria=this.criteria;

		//build and evaluate test criteria for incomplete achievements
		if(eval(criteria.stat+criteria.operator+criteria.threshold)&&!this.complete){
			// console.log('\n\nAchievement Unlocked: '+this.title);
			// console.log(this.description);
			// console.log(criteria.stat+criteria.operator+criteria.threshold);
			// console.log(eval(criteria.stat+criteria.operator+criteria.threshold));
			this.complete=true;
			this.completedOn=Date.now();

			//build modal achievement
			var newAchievement='<div class="modal-achievement">'+
				'<h2>Achievement Unlocked</h2>'+
				'<div class="achievement-image-wrapper">'+
					'<img src="achievements/'+this.slug+'.png">'+
				'</div>'+
				'<h2 class="achievement-title">'+this.title+'</h2>'+
				'<p>'+this.description+'</p>'+
			'</div>';

			//append to field
			$(newAchievement).appendTo('.modal-achievements-list');
		}

	});
	
	if($('.modal-achievement').length){
		$('#achievementsModal').modal().one('shown.bs.modal', function () {
			$('.modal-achievements-list').flickity({
				prevNextButtons:false,
				pageDots:false
			});
			$('.modal-achievements-list').animate({opacity:'1'},$globalFadeTime);
		});
	}

	callback();
}

//populate achievements screen
function populateAchievements(){
	$('.achievements-list').empty();
	$.each($data.achievements, function(){

		var image=this.complete?this.slug:'lock';

		var newAchievement='<a href="#" class="achievement">'+
				'<div class="achievement-image-wrapper">'+
					'<img src="achievements/'+image+'.png">'+
				'</div>'+
				'<span class="achievement-title">'+this.title+'</span>'+
				'<span class="achievement-description">'+this.description+'</span>'+
			'</a>';
		$(newAchievement).appendTo('.achievements-list');
	});
}

// ====================================
// 				^GAME
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

	//save for overall stats, if perfect, iterate that
	$data.stats.gamesPlayed++;
	$data.stats.cumulativeScore+=$gameScore;
	$data.stats.correctScore+=$gameCorrectScore;
	$data.stats.bonusScore+=$gameBonusScore;
	$data.stats.fastAnswers+=$gameFastAnswers;
	if($gameScore===($bonusScore+$correctScore)*$gameLength){
		$data.stats.perfectGames++;
	}

	//process achievements and update local data
	processAchievements(updateLocalData);
	

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
			$('.game-image').hide();
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
	if(currentQuestion.image){
		$('.game-image img').attr('src','categories/'+$categories[$currentCategory].slug+'/'+currentQuestion.image);
		$('.game-image').show();
	}

	//clear answer space and populate with answers
	$('.game-answers').empty();
	$.each(currentQuestion.answers,function(){
		var newAnswer=$('<a href="#" class="answer">'+this.answer+'</a>');
		if(this.correct){
			newAnswer.addClass('correct');
		}
		newAnswer.appendTo('.game-answers');
	});
	$('.game-answers').randomize('.answer');

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

				//if answered fast, add to count
				if(answerTime<$fastAnswerTime){
					$gameFastAnswers++;
				}

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
	$gameFastAnswers=0;
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
// 				^STATS
// ====================================

//tests for completion of category (accepts slug or index), returns object with percentage and true/false
function isComplete(category){
	
	//if slug provided, find index
	if(typeof category === 'string'){
		$.each($categories,function(index){
			if(this.slug===category){
				category=index;
			}
		});
	}

	var questions = $categories[category].questions,
		completeCount = 0,
		trueFalse,
		percentage;

	//check each question for completion, add to count
	$.each(questions, function(){
		if(this.complete){
			completeCount++;
		}
	});

	//generate percentage and true false result
	percentage=completeCount/questions.length;
	if(percentage===1){
		trueFalse = true;
	}
	else{
		trueFalse = false;
	}

	return {percentage: percentage, boolean: trueFalse, complete: completeCount, total: questions.length};
}

//populate stats screen
function populateStats(){

	//empty existing data form lists
	$('.stats-latest-achievements-list,.stats-categories-list').empty();

	//variables for accumulation
	var achievementCount=0,
		completedQuestions=0,
		totalQuestions=0,
		completedCategories=0,
		completedAchievements=[];

	//loop achievements increment count if complete
	$.each($data.achievements,function(){
		if(this.complete){
			achievementCount++;
			completedAchievements.push(this);
		}
	});

	//sort completed achievements by date, newest to oldest
	completedAchievements.sort(function(a,b){
		return parseFloat(b.completedOn) - parseFloat(a.completedOn);
	});

	//slice to 3 newest achievements, display
	var newestCompletedAchievements= completedAchievements.slice(0,3);
	$.each(newestCompletedAchievements, function(){
		$('<h4>'+this.title+'</h4>').appendTo('.stats-latest-achievements-list');
	});

	//get completed questions total count and add category to category list
	$.each($categories,function(index){
		
		//save completion status
		var completionStatus=isComplete(index);
		
		//if category fully complete, increment complete count
		if(completionStatus.boolean){
			completedCategories++;
		}

		//add topic totals to overall totals
		completedQuestions+=completionStatus.complete;
		totalQuestions+=completionStatus.total;

		//render category listing for stats screen
		var newCategory='<div class="stats-category">'+
				'<img src="categories/'+this.slug+'/icon.png">'+
				'<h4>'+this.title+'</h4>'+
				'<h5>Completed: '+completionStatus.complete+'/'+completionStatus.total+'</h5>'+
				'<h5>Times played: '+this.played+'</h5>'+
				'<h5>High score: '+this.highScore+'</h5>'+
				'<h5>Last score: '+this.lastScore+'</h5>'+
			'</div>';

		//add to list
		$(newCategory).appendTo('.stats-categories-list');
	});

	//add general stats
	$('.stats-times-played .stat-number').text($data.stats.gamesPlayed);
	$('.stats-achievements .stat-number').text(achievementCount);
	$('.stats-completed .stat-number').text(completedCategories);
	$('.stats-questions-completed-inner').css('width',completedQuestions/totalQuestions*100+'%');
}

// ====================================
// 				^CATEGORIES
// ====================================

//populates categories list with fresh data
function populateCategories(){

	//empty existing
	$('.categories-list,.modal-categories-list').empty();
	
	//for each category
	$.each($categories,function(index){

		//find complete percentage
		var completePercentage=isComplete(index).percentage*100;

		//build button on categories screen
		var newCategory='<a href="#" class="category" data-categoryIndex="'+index+'">'+
		'<div class="category-image-wrapper">'+
		'<img src="categories/'+this.slug+'/icon.png">'+
		'</div>'+
		'<span class="category-title">'+this.title+'</span>'+
		'<div class="category-progress"><div class="category-progress-inner" style="width:'+completePercentage+'%"></div></div>'+
		'</a>';

		//append to field
		$(newCategory).appendTo('.categories-list');

		//build modal category
		var newModalCategory='<div class="modal-category">'+
			'<div class="category-image-wrapper">'+
				'<img src="categories/'+this.slug+'/icon.png">'+
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
// 				^INIT AND HANDLERS
// ====================================

function init(data){

	//define categories from data, populate first screen
	$data=data;
	$categories=$data.categories;
	populateCategories();
	
}

$(document).ready(function(){

	//implement fastclick
	FastClick.attach(document.body);

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
		$consecutiveGames=1;
		changeScreen('screen-game',{before:playGame});
	});

	//back to categories after
	$('body').on('click','.btn-gameover',function(){
		changeScreen('screen-categories',{before: function(){
			$('.end-history, .modal-achievements-list').flickity('destroy').empty().css('opacity','0');
			populateCategories();}});
	});

	//try again button, restart game
	$('body').on('click','.btn-restart',function(){
		changeScreen('screen-game',{before:function(){
			$('.end-history, .modal-achievements-list').flickity('destroy').empty().css('opacity','0');
			$consecutiveGames++;
			playGame();
		}});
	});

	//navigate to achievements screen
	$('.nav-achievements').click(function(){
		changeScreen('screen-achievements',{before:populateAchievements});
	});

	//navigate to achievements screen
	$('.nav-stats').click(function(){
		changeScreen('screen-stats',{before:populateStats});
	});

	//navigate to categories screen
	$('.nav-categories').click(function(){
		changeScreen('screen-categories');
	});

	//rests stat data for testing
	$('.stats-reset').click(function(){
		//reset data
		loadData(true);
	});
});