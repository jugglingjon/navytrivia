var $data,
	$categories,
	$categoryGrid,
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
	$correctScore=100,
	$bonusScore=100,
	$gameData=[],
	$localKey='navyTriviaDataAlpha',
	$currentScreen='screen-categories',
	$lastScreen='screen-categories',
	$version='1.0';

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

//convert number to number with commas
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//converts spaces to dashes
function toDashes(text){
	return text.replace(' ','-');
}

//converts spaces to spaces
function toSpaces(text){
	return text.replace('-','');
}

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
	
	//manage current and last screen variables
	$lastScreen=$currentScreen;
	$currentScreen=screenClass;

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
				'<div class="achievement-content">'+
					'<h1>Achievement Unlocked</h1>'+
					'<div class="achievement-wrapper">'+
						'<div class="achievement-image-wrapper">'+
							'<img src="achievements/'+this.slug+'.png">'+
						'</div>'+
						'<h2 class="achievement-title">'+this.title+'</h2>'+
						'<p class="achievement-description">'+this.description+'</p>'+
					'</div>'+
				'</div>'+
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

		var newAchievement='<div class="achievement" data-complete="'+this.complete+'">'+
				'<div class="achievement-image-wrapper">'+
					'<img src="achievements/'+image+'.png">'+
				'</div>'+
				'<span class="achievement-title">'+this.title+'</span>'+
				'<span class="achievement-description">'+this.description+'</span>'+
			'</div>';
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
	$('.correct-score').text(numberWithCommas($gameCorrectScore));
	$('.correct-score-count').text($gameCorrectCount)
	$('.correct-score-total').text($gameLength);

	$('.bonus-score').text(numberWithCommas($gameBonusScore));
	$('.end-score').text(numberWithCommas($gameScore));
	
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
				prevNextButtons: false,
				pageDots: false
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
			$('.game-question-wrapper').show();

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

	//if image, show, and hide normal question
	if(currentQuestion.image){
		$('.game-image').show().attr('style','background-image: url(categories/'+$categories[$currentCategory].slug+'/'+currentQuestion.image+')');
		$('.game-question-wrapper').hide();
	}

	//clear answer space and populate with answers
	$('.game-answers').empty();
	$.each(currentQuestion.answers,function(){
		var newAnswer=$('<a href="#" class="answer"><span class="answer-text">'+this.answer+'</span></a>');
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
	var newestCompletedAchievements= completedAchievements.slice(0,4);
	$.each(newestCompletedAchievements, function(){
		$('<div class="latest-achievement"><div class="latest-achievement-image"><img src="achievements/'+this.slug+'.png" class="img-responsive"></div><h4 class="lastest-achievement-label" style="display:none;">'+this.title+'</h4></div>').appendTo('.stats-latest-achievements-list');
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
		var newCategory='<div class="stat-category">'+
				'<div class="stat-category-icon">'+
					'<img src="categories/'+this.slug+'/icon.png" class="img-responsive">'+
				'</div>'+
				'<div class="stat-category-content">'+
					'<h3>'+this.title+'</h3>'+
					'<div class="category-data">'+
						'<div class="category-complete clearfix">'+
							'<span class="category-complete-label">Questions Completed</span><span class="category-complete-number">'+Math.ceil(completionStatus.percentage*100)+'%</span>'+
						'</div>'+
						'<div class="category-progress"><div class="category-progress-inner" style="width:'+completionStatus.percentage*100+'%"></div></div>'+

						'<div class="category-stats clearfix">'+
							'<div class="category-stat"><h3>'+this.played+'</h3><h4>Times Played</h4></div>'+
							'<div class="category-stat"><h3>'+numberWithCommas(this.highScore)+'</h3><h4>High Score</h4></div>'+
							'<div class="category-stat"><h3>'+numberWithCommas(this.lastScore)+'</h3><h4>Last Score</h4></div>'+
						'</div>'+
					'</div>'+
				'</div>'+
			'</div>';

		//add to list
		$(newCategory).appendTo('.stats-categories-list');
	});

	//add general stats
	$('.stats-cumulative-stat-played').text($data.stats.gamesPlayed);
	$('.stats-cumulative-stat-achievements').text(achievementCount);
	$('.stats-cumulative-stat-perfect').text($data.stats.perfectGames);
	$('.stats-cumulative-stat-completed').text(completedCategories);
	$('.stats-questions-completed-inner').css('width',completedQuestions/totalQuestions*100+'%');
}

// ====================================
// 				^CATEGORIES
// ====================================

//populates categories list with fresh data
function populateCategories(){

	//array of tags
	var tagArray=[]


	//empty existing
	$('.categories-list').isotope('destroy');
	$('.categories-list,.modal-categories-list').empty();
	
	//for each category
	$.each($categories,function(index){

		//read tags for category
		var categoryTags=$.map(this.tags,function(text){
			
			//if not in total list, add
			if(tagArray.indexOf(text)===-1){
				tagArray.push(text);
			}

			//add convert to slug version for data-tags
			return toDashes(text);
		});

		//find complete percentage
		var completePercentage=isComplete(index).percentage*100;

		//build button on categories screen
		var newCategory='<a href="#" class="category" data-categoryIndex="'+index+'" data-tags="'+categoryTags.join(' ')+'">'+
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
			'<p class="category-description">'+this.description+'</p>'+
			'<div class="category-data">'+
				'<div class="category-complete clearfix">'+
					'<span class="category-complete-label">Questions Completed</span><span class="category-complete-number">'+Math.ceil(completePercentage)+'%</span>'+
				'</div>'+
				'<div class="category-progress"><div class="category-progress-inner" style="width:'+completePercentage+'%"></div></div>'+

				'<div class="category-stats clearfix">'+
					'<div class="category-stat"><h3>'+this.played+'</h3><h4>Times Played</h4></div>'+
					'<div class="category-stat"><h3>'+numberWithCommas(this.highScore)+'</h3><h4>High Score</h4></div>'+
					'<div class="category-stat"><h3>'+numberWithCommas(this.lastScore)+'</h3><h4>Last Score</h4></div>'+
				'</div>'+
			'</div>'+
			'<a href="#" data-categoryIndex="'+index+'" class="btn btn-primary modal-category-play">Play</a>'+
		'</div>';

		//append to field
		$(newModalCategory).appendTo('.modal-categories-list');

		
	});

	//populate drop down filter
	$('.tag-select').empty();
	$('.tag-select').append($('<option value="">All Topics</option>'))
	$.each(tagArray,function(){
		$('.tag-select').append($('<option value="'+toDashes(this)+'">'+this+'</option>'));
	});
	$categoryGrid=$('.categories-list').isotope();
	
	//fade in categories list if not already
	$('.categories-list').animate({'opacity':'1'},$globalFadeTime);
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

	//populate version number
	$('#version').text('v'+$version);

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

	//category tags dropdown
	$('.tag-select').change(function(){
		//get selected tag
		var selected=$(this).val();
		
		//if blank, show all, otherwise check data-tags attribute
		if(!selected){
			$categoryGrid.isotope({filter:'*'});
		}
		else{
			$categoryGrid.isotope({filter:'[data-tags*='+selected+']'});
		}
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
			$('.categories-list').css({'opacity':'0'});
			},
			after:function(){		
				populateCategories();
				
			}});
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

	//navigate to previous screen
	$('.nav-back').click(function(){
		changeScreen($lastScreen);
	});

	//rests stat data for testing
	$('.stats-reset').click(function(){
		//reset data
		loadData(true);
	});

	//set animation for achievements modal
	// $('#categoriesModal').on('show.bs.modal',function(){
	// 	$(this).find('.modal-dialog').attr('class','modal-dialog fadeInDown animated');
	// });

	// $('#categoriesModal').on('hide.bs.modal',function(){
	// 	$(this).find('.modal-dialog').attr('class','modal-dialog fadeOutUp animated');
	// });
});