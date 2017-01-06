var $categories,
	globalFadeTime=500;


// ====================================
// 				SCREEN CONTROL
// ====================================

//changes to targeted screen
function changeScreen(screenClass, after){
	$('.screen:not(.'+screenClass+')').fadeOut(globalFadeTime, function(){
		$('.'+screenClass).fadeIn(globalFadeTime);
	});

	if(after){
		after();
	}
}

function playGame(){
	//alert('game playing');
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
		$('.screen-game').text($(this).attr('data-categoryIndex'));
		changeScreen('screen-game',playGame);
	});
});