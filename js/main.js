var $categories,
	$globalFadeTime=500,
	$currentCategory,
	$gameScore=0,
	$currentQuestion=0,
	$gameLength=5;

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
// 				SCREEN CONTROL
// ====================================



//changes to targeted screen
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

}

// ====================================
// 				GAME
// ====================================

//game end
function endGame(){
	$('.end-score').text($gameScore);
	changeScreen('screen-end');
}

//loads specified question and options into question screen
function loadQuestion(question){

	var currentQuestion=$categories[$currentCategory].questions[question];

	$('.game-category').text($categories[$currentCategory].title);
	$('.game-question').text(currentQuestion.question);

	$('.game-answers').empty();
	$.each(currentQuestion.answers,function(){
		var newAnswer=$('<a href="#" class="answer">'+this.answer+'</a>');
		if(this.correct){
			newAnswer.addClass('correct');
		}
		newAnswer.appendTo('.game-answers');
	});

	$('.screen-game').fadeIn($globalFadeTime);

	$('.answer').click(function(){
		if($(this).hasClass('correct')){
			//add correct score bonus
			$gameScore+=1000;
			alert('correct');

			//mark correct in data
			currentQuestion.complete=true;
			updateLocalData();
		}
		else{
			alert('incorrect');
		}

		//check for final question
		$('.screen-game').fadeOut($globalFadeTime,function(){
			if($currentQuestion<($gameLength-1)){
				$currentQuestion++;
				loadQuestion($currentQuestion);
			}
			else{
				endGame();
			}
			
		});
		
	});
}

//shuffles questionsand initiates game
function playGame(){

	//zero out game progress variables
	$currentQuestion=0;
	$gameScore=0;

	//shuffle questions and begin game
	shuffle($categories[$currentCategory].questions);
	loadQuestion($currentQuestion);
}


// ====================================
// 				DATA
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
	$categories=data.categories;
	populateCategories();
	
}

$(document).ready(function(){

	//read json data file and initiate
	$.getJSON('categories.json', function(data){
		init(data);
	});

	//when category button is clicked, open modal and init flickity to that index
	$('.categories-list').on('click','.category',function(){
		var clickedIndex=parseInt($(this).attr('data-categoryIndex'));
		$('#categoriesModal').modal().one('shown.bs.modal', function () {
			$('.modal-categories-list').flickity({
				prevNextButtons:false,
				pageDots:false,
				initialIndex:clickedIndex
			});
			$('.modal-categories-list').css('opacity','1');
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
		changeScreen('screen-categories',{before:populateCategories});
	});
});