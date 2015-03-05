/*
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
FLAG Game Engine - WINDEDITOR.js
Author: Zac Zidik
URL: www.flagamengine.com/WIND
version 1.0.0
updated 4/8/2014

This is the editor code for the WIND object used by FLAG.
Use the editor to create metrics and events for your game.

Thanks for trying out the WIND Editor and good luck!
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
*/

//WIND EDITOR (WE)
//the instance of the WIND editor
//----------------------------------------------------------------------------------------------
var WE = {};


//FLAG START
//called after FLAG is initialized
//----------------------------------------------------------------------------------------------
function start(){

	//create an instance of the WINDEDITOR
	WE = new WINDEDITOR();

	WIND.initPlayer();
	WE.updateJSON();

	WE.buildGUI();
	
	FLAG.loadScene(0,WE.sceneLoaded);
	
	//put the progressBar in the center of the screen
	document.getElementById("progressBar").style.left = ((FLAG.Canvas.width/2) - 100).toString() + "px";
	document.getElementById("progressBar").style.top = ((FLAG.Canvas.height/2) - 150).toString() + "px";
	document.getElementById("progressBar").style.visibility = "visible";
	document.getElementById("loadProgressText").innerHTML = "0%";
	
	//periodically the showLoadProgress function
	WE.loadInterval = setInterval(function(){WE.showLoadProgress();},250);
}
//----------------------------------------------------------------------------------------------
//END FLAG START



//WINDEDITOR CONSTRUCTOR
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
var WINDEDITOR = function(){
	
	//PROPERTIES
	//keep track of the state of GUI menu items
	//-------------------------------------------
	this.effectSelected = -1;
	this.eGroupSelected = -1;
	this.eventSelected = -1;
	this.loadInterval = null;
	this.metricSelected = 1;
	this.PlayerMeticsView = [];
	this.reloadTimeOut = 0;
	this.simEvent = -1;
	this.undos = [];	

}


//METHODS

//ADD EFFECT
//adds a new effect to either an event or an eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.addEffect = function(whichBut){
	//add an effect to the proper array
	switch(whichBut.id){
		case "addEffect_ot":
			var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
			effectsArray.push([0,"=",0,0]);
			this.fillEffectsData("ot");
			FLAG.Scene.resize();
			break; 	
		case "addEffect_r":
			var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
			effectsArray.push([0,"=",0,0]);
			this.fillEffectsData("r");
			FLAG.Scene.resize();
			break; 	
		case "addEffect_eGroup":
			WIND.eGroups[this.eGroupSelected].e.push([0,"=",0,0]);
			this.fillEffectsData("g");
			FLAG.Scene.resize();
			break;		
	}
}
//----------------------------------------------------------------------------------------------
//END ADD EFFECT



//ADD eGROUP
//adds a new eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.addeGroup = function(){
	
	if(document.getElementById("eGroupName").value != ""){	
		this.createUndo();		
		this.fill_eGroups();
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}	
}
//----------------------------------------------------------------------------------------------
//END ADD eGROUP



//ADD EVENT
//adds a new event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.addEvent = function(){

	this.createUndo();
	
	var newEvent = {
		name			:		'Event ' + WIND.events.length,
		type			:		0,
		mText			:		'',
		effects			:		[{text:'',ot:[],r:[]}]
	};
	
	WIND.events.push(newEvent);
	
	this.eventSelected = WIND.events.length-1;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ADD EVENT



//ADD METRIC
//adds a new metric
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.addMetric = function(){
	if(document.getElementById("metricName").value != "" && document.getElementById("metricValue").value != ""){
	
		this.createUndo();
	
		var newMetric = {
			name	:	document.getElementById("metricName").value,
			value	:	document.getElementById("metricValue").value,
			neg		:	true
		};
		
		//is allow negative checked?
		if(document.getElementById("allowNeg").checked != true){
			newMetric.neg = false;
		}
		
		//is there extras?
		if(document.getElementById("extras").value != ""){
			//is it an object?
			if(document.getElementById("extras").value.charAt(0) == "{"){
				var obj = JSON.parse(document.getElementById("extras").value);
				newMetric.extras = obj;
			
			}else{
				newMetric.extras = document.getElementById("extras").value;
			}
		}
		
		WIND.metrics.push(newMetric);
	}
	
	this.updateJSON();
	this.fillMetricsList();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ADD METRIC



//ADD PREREQUISITE
//adds a prerequisite to an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.addPrerequisite = function(){

	if(this.eventSelected != -1){

		this.createUndo();
	
		//if there are no prerequisites yet
		if(WIND.events[this.eventSelected].prerequisites == undefined){
		
			WIND.events[this.eventSelected].prerequisites = [0];
			WIND.events[this.eventSelected].prerequisiteMatchAmounts = [false];
	
		//if there are prerequisites already
		}else{
	
			WIND.events[this.eventSelected].prerequisites.push(0);
			WIND.events[this.eventSelected].prerequisiteMatchAmounts.push(false);
		}
	
		this.fillEventsData();
	
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ADD PREREQUISITE



//AUTO RUN EVENTS
//runs a defined amount of events consecutively
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.autoRunEvents = function(){
	if(document.getElementById('numTurns').value != ''){
	
		var numEvents = WIND.events.length;
		var numTurns = Number(document.getElementById('numTurns').value);
		
		for(var e=0;e<numTurns;e++){
			
			//pick a random Number
			var evtNum = Math.floor((Math.random()*numEvents)+0);
			
			switch(WIND.events[evtNum].type){
	
				//happenstance
				case 0:
					WIND.runEvent({evt:evtNum,opt:0});
					break;
			
				//multiple choice
				case 1:
					//how many effect choices are there?
					var numEffects = WIND.events[evtNum].effects.length;
					//pick an effect
					var eftNum = Math.floor((Math.random()*numEffects)+0);
					
					WIND.runEvent({evt:evtNum,opt:eftNum});
					break;
					
				//multiple selection
				case 2:
					//how many effect choices are there?
					var numEffects = WIND.events[evtNum].effects.length;
					var options = [];
					//pick a random number of effects
					var opts = Math.floor((Math.random()*numEffects)+1);
					for(var o=0;o<opts;o++){
						//pick an effect
						options.push(o);
					}
					
					WIND.runEvent({evt:evtNum,opt:options});
					break;
			
				//slider
				case 3:
					//pick a value between the two values
					var value = Math.floor((Math.random()*WIND.events[evtNum].effects[1].value)+WIND.events[evtNum].effects[0].value);
				
					WIND.runEvent({evt:evtNum,opt:value});
					break;
			
			}			
		}	
		
		//clear the display
		document.getElementById("simContent").innerHTML = '';
	
		this.updateDisplay_postEvent();	
	}
}
//----------------------------------------------------------------------------------------------
//END AUTO RUN EVENTS



//BUILD GUI
//fills the HTML with dynamic data
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.buildGUI = function(){

	//keep menus to the right
	document.getElementById("menus").style.left=(window.innerWidth-300).toString()+"px";
	
	this.fillMetricsList();
	
	this.fillEventsData();
	
	this.fill_eGroups();
	
	this.menus('metrics');
	
	this.updateJSON();
}
//----------------------------------------------------------------------------------------------
//END BUILD GUI



//CENTER POPUPS
//keeps popup menus in the center of screen
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.centerPopUp = function(){
	var style = window.getComputedStyle(document.getElementById("popUp")),
	//remove px 
    width = Number(style.getPropertyValue('width').slice(0,-2)),
    //remove px
    height = Number(style.getPropertyValue('height').slice(0,-2));
    
    var gameStyle = window.getComputedStyle(document.getElementById("game")),
	//remove px 
    gameWidth = Number(gameStyle.getPropertyValue('width').slice(0,-2)),
    //remove px
    gameHeight = Number(gameStyle.getPropertyValue('height').slice(0,-2));
    
    document.getElementById("popUpContent").style.maxHeight = (gameHeight-60).toString()+"px";
    
	//center on screen   
	var top = 0, left = 0;
	if((gameHeight/2)-(height/2) < 35){
		top = 35;
	}else{
		top = (gameHeight/2)-(height/2);
	}
	if((gameWidth/2)-(width/2) < 0){
		left = 0;
	}else{
		left = (gameWidth/2)-(width/2);
	}
	document.getElementById("popUp").style.top = (top).toString()+"px";
	document.getElementById("popUp").style.left = (left).toString()+"px";
}
//----------------------------------------------------------------------------------------------
//END CENTER POPUPS



//CHANGE DECIMALS
//edit the amount of decimal places the events' effects round out to
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeDecimals = function(){
	if(document.getElementById("numDecimals").value == ''){
		document.getElementById("numDecimals").value = 0;
	}
	
	WIND.decimals = Number(document.getElementById("numDecimals").value);
	
	this.updateJSON();
}
//----------------------------------------------------------------------------------------------
//END CHANGE DECIMALS



//CHANGE EVENT
//change the selected event for editing, from the events drop down
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeEvent = function(){
	
	this.eventSelected = document.getElementById('eventsList').selectedIndex;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END CHANGE EVENT



//CHANGE EVENT TYPE
//alters the type of the event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeEventType = function(){

	if(this.eventSelected != -1){
	
		this.createUndo();

		WIND.events[this.eventSelected].type = document.getElementById("eventType").selectedIndex;
	
		switch(WIND.events[this.eventSelected].type){
	
			//happenstance
			case 0:
				//keep only first effect
				var newEffect = {
									text	:	WIND.events[this.eventSelected].effects[0].text,
									ot		:	WIND.events[this.eventSelected].effects[0].ot,
									r		:	WIND.events[this.eventSelected].effects[0].r
								};
					
				var effectsToKeep = [];
				effectsToKeep.push(newEffect);
				WIND.events[this.eventSelected].effects = effectsToKeep;
				effectsToKeep = [];
				break;
		
			//multiple choice	
			case 1:
				//recreate the effects, excluding any value properties from slider 
				var numEffects = WIND.events[this.eventSelected].effects.length;
				//keep all effects
				var effectsToKeep = [];
				for(var e=0;e<numEffects;e++){
					var newEffect = {
										text	:	WIND.events[this.eventSelected].effects[e].text,
										ot		:	WIND.events[this.eventSelected].effects[e].ot,
										r		:	WIND.events[this.eventSelected].effects[e].r
									};
					effectsToKeep.push(newEffect);
				}
				WIND.events[this.eventSelected].effects = effectsToKeep;
				effectsToKeep = [];
				break;
				
			//multiple selection	
			case 2:
				//recreate the effects, excluding any value properties from slider 
				var numEffects = WIND.events[this.eventSelected].effects.length;
				//keep all effects
				var effectsToKeep = [];
				for(var e=0;e<numEffects;e++){
					var newEffect = {
										text	:	WIND.events[this.eventSelected].effects[e].text,
										ot		:	WIND.events[this.eventSelected].effects[e].ot,
										r		:	WIND.events[this.eventSelected].effects[e].r
									};
					effectsToKeep.push(newEffect);
				}
				WIND.events[this.eventSelected].effects = effectsToKeep;
				effectsToKeep = [];
				break;
			
			//slider
			case 3:
				//if the effect has more than two options
				var numEffects = WIND.events[this.eventSelected].effects.length;
				if(numEffects >= 2){
					//keep only first two effects
					var effectsToKeep = [];
					for(var e=0;e<2;e++){
						var newEffect = {
											text	:	WIND.events[this.eventSelected].effects[e].text,
											ot		:	WIND.events[this.eventSelected].effects[e].ot,
											r		:	WIND.events[this.eventSelected].effects[e].r,
											value	:	0
										};
						effectsToKeep.push(newEffect);
					}
					WIND.events[this.eventSelected].effects = effectsToKeep;
					effectsToKeep = [];
				
					//change the value of the second effect to 100
					WIND.events[this.eventSelected].effects[1].value = 100;
			
				}else if(numEffects == 1){
					//keep the the effect
					var effectsToKeep = [];
					//add a value to the effect, only sliders have values
					WIND.events[this.eventSelected].effects[0].value = 0;
					effectsToKeep.push(WIND.events[this.eventSelected].effects[0]);
				
					//add a second effect
					var newEffect = {
										text	:	"",
										ot		:	[],
										r		:	[],
										value	:	100
									};
					effectsToKeep.push(newEffect);
					WIND.events[this.eventSelected].effects = effectsToKeep;
					effectsToKeep = [];
				}			
				break;
		}
		
		this.effectSelected = 0;
		
		this.fillEventsData();
	
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	
	}
}
//----------------------------------------------------------------------------------------------
//END CHANGE EVENT TYPE



//CHANGE METRIC OR eGROUP
//controls if an effect is on a metric or is an eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeMetricoreGroup = function(whichBut){
	
	//which effect are we editing
	if(whichBut.id.charAt(0) == "o"){
		var whichEffects = "ot";
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
		//grab the Number
		var num = Number(whichBut.id.slice(7));		
	}else if(whichBut.id.charAt(0) == "r"){
		var whichEffects = "r";
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
		//grab the Number
		var num = Number(whichBut.id.slice(6));
	}

	//is a metric selected
	if(whichBut.selectedIndex == 0){
		
		effectsArray[num] = [0,"=",0,0];
	
	//is a eGroup selected
	}else if(whichBut.selectedIndex == 1){
	
		effectsArray[num] = ["g",0];
	
	}

	this.fillEffectsData(whichEffects);
}
//----------------------------------------------------------------------------------------------
//END CHANGE METRIC OR eGROUP



//CHANGE PMS VIEW
//controls the display of Player Metrics in the Sim Overlay
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changePMSview = function(){
	var group = document.getElementsByName('pms');
	for (var i=0;i<group.length;i++) {
		if (group[i].checked) {
			//0 - means not showing, 1 - means showing
			this.PlayerMeticsView[i] = 1;
		}else{
			this.PlayerMeticsView[i] = 0;
		}
	}
	
	//change the simOverlay
	html = "";
	var numMetrics = WIND.Player.metrics.length;
	for(var i=0;i<numMetrics;i++){
		if(this.PlayerMeticsView[i] == 1){
			html += '<div class="simMetric" id="simMetric_'+i+'">';
			html += '<span class="simMetric_name" id="'+WIND.Player.metrics[i].name+'">';
			html += WIND.Player.metrics[i].name;
			html += '</span>';
			html += '<span class="simMetric_value" id="'+WIND.Player.metrics[i].name+'_value">';
			html += WIND.Player.metrics[i].value;
			html += '</span>';
			html += '</div>';
		}
	}
	document.getElementById("simMetrics").innerHTML = html;

}
//----------------------------------------------------------------------------------------------
//END CHANGE PMS VIEW



//CHANGE PREREQUISITE
//change a prerequisite event for an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changePrerequisite = function(which){

	this.createUndo();

	var num = Number(which.id.slice(4));
	WIND.events[this.eventSelected].prerequisites[num] = which.selectedIndex;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";	
}
//----------------------------------------------------------------------------------------------
//END CHANGE PREREQUISITE



//CHANGE PREREQUISITE MATCH AMOUNTS
//change the prerequisite match amounts value for an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeMatchAmounts = function(which){

	this.createUndo();
	
	var num = Number(which.id.slice(3));
	
	WIND.events[this.eventSelected].prerequisiteMatchAmounts[num] = document.getElementById(which.id).checked;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";	
}
//----------------------------------------------------------------------------------------------
//END CHANGE PREREQUISITE MATCH AMOUNTS



//CHANGE SELECTED EVENT
//controls the which event is selected to be edited in the event menu
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeSelectedEffect = function(){
	this.effectSelected = document.getElementById("effectsList").selectedIndex;
}
//----------------------------------------------------------------------------------------------
//END CHANGE SELECTED EVENT



//CHANGE TYPE
//sets the type of effect on a metric, metric, number or compound
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.changeType = function(whichBut){
	
	if(whichBut.id.charAt(0) == "o"){
		var whichEffects = "ot";
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
		//grab the Number
		var num = Number(whichBut.id.slice(8));		
	}else if(whichBut.id.charAt(0) == "r"){
		var whichEffects = "r";
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
		//grab the Number
		var num = Number(whichBut.id.slice(7));
	}else if(whichBut.id.charAt(0) == "g"){
		var whichEffects = "g";
		var effectsArray = WIND.eGroups[this.eGroupSelected].e;
		//grab the Number
		var num = Number(whichBut.id.slice(7));
	}
	
	effectsArray[num][2] = Number(whichBut.selectedIndex);
	effectsArray[num][3] = 0;
	
	this.fillEffectsData(whichEffects);
}
//----------------------------------------------------------------------------------------------
//END CHANGE TYPE



//CLEAR EVT DISPLAY
//clears the event display
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.clearEvtDisplay = function(){
	document.getElementById("simContent").innerHTML = '';
}
//----------------------------------------------------------------------------------------------
//END CLEAR EVT DISPLAY



//CLONE
//makes a copy of a JSON object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.clone = function(obj){
    return JSON.parse(JSON.stringify(obj));
};
//----------------------------------------------------------------------------------------------
//END CLONE



//COPY EVENT
//makes a copy of an event and adds it to the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.copyEvent = function(){
	
	if(this.eventSelected != -1){
		this.createUndo();
	
		var newEvent = {
			name			:		String(WIND.events[this.eventSelected].name + "_copy"),
			type			:		Number(WIND.events[this.eventSelected].type),
			mText			:		String(WIND.events[this.eventSelected].mText),
			effects			:		[]
		};
	
		var numEffects = WIND.events[this.eventSelected].effects.length;
		for(var i=0;i<numEffects;i++){
	
			var newEffect = {
				text	:	String(WIND.events[this.eventSelected].effects[i].text),
				ot		:	[],
				r		:	[]
			};
		
			var numOTeffects = WIND.events[this.eventSelected].effects[i].ot.length;
			for(var j=0;j<numOTeffects;j++){
			
				//is the effect an eGroup
				if(WIND.events[this.eventSelected].effects[i].ot[j][0] == 'g'){
			
					newEffect.ot.push(['g',Number(WIND.events[this.eventSelected].effects[i].ot[j][1])]);

				//is the effect a direct effect on a metric
				}else{
		
					newEffect.ot.push([Number(WIND.events[this.eventSelected].effects[i].ot[j][0]),String(WIND.events[this.eventSelected].effects[i].ot[j][1]),Number(WIND.events[this.eventSelected].effects[i].ot[j][2]),Number(WIND.events[this.eventSelected].effects[i].ot[j][3])]);
		
				}
			}
	
			var numReffects = WIND.events[this.eventSelected].effects[i].r.length;
			for(var j=0;j<numReffects;j++){
			
				//is the effect an eGroup
				if(WIND.events[this.eventSelected].effects[i].r[j][0] == 'g'){
			
					newEffect.r.push(['g',Number(WIND.events[this.eventSelected].effects[i].r[j][1])]);
			
				//is the effect a direct effect on a metric
				}else{
		
					newEffect.r.push([Number(WIND.events[this.eventSelected].effects[i].r[j][0]),String(WIND.events[this.eventSelected].effects[i].r[j][1]),Number(WIND.events[this.eventSelected].effects[i].r[j][2]),Number(WIND.events[this.eventSelected].effects[i].r[j][3])]);
			
				}
			}
		
			//is the event a slider
			if(WIND.events[this.eventSelected].type == 3){
				newEffect.value = Number(WIND.events[this.eventSelected].effects[i].value);
			}
				
			newEvent.effects.push(newEffect);
		}
	
		//prerequisites
		if(WIND.events[this.eventSelected].prerequisites != undefined){
			var numPrerequisites = WIND.events[this.eventSelected].prerequisites.length;
			newEvent.prerequisites = [];
			newEvent.prerequisiteMatchAmounts = [];
			for(var p=0;p<numPrerequisites;p++){
				newEvent.prerequisites.push(Number(WIND.events[this.eventSelected].prerequisites[p]));
				newEvent.prerequisiteMatchAmounts.push(Number(WIND.events[this.eventSelected].prerequisiteMatchAmounts[p]));
			}	
		}
	
		//repeat limit	
		if(WIND.events[this.eventSelected].repeatLimit != undefined){
			newEvent.repeatLimit = Number(WIND.events[this.eventSelected].repeatLimit);
		}
	
	
		WIND.events.push(newEvent);
	
		this.eventSelected = WIND.events.length-1;
	
		this.fillEventsData();
	
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END COPY EVENT



//COPY METRIC
//makes a copy of a metric and adds it to the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.copyMetric = function(){

	if(this.metricSelected != -1){
		
		this.createUndo();
		
		var copieddMetric = {
			name	:	WIND.metrics[this.metricSelected].name+"_copy",
			value	:	WIND.metrics[this.metricSelected].value
		};
		
		//is there extras?
		if(WIND.metrics[this.metricSelected].extras != undefined){
			//is it an object?
			if(typeof WIND.metrics[this.metricSelected].extras == "object"){
				var string = JSON.stringify(WIND.metrics[this.metricSelected].extras);
				var obj = JSON.parse(string);
				copieddMetric.extras = obj;
			
			}else{
			
				//are the extras a number
				if(isNaN(WIND.metrics[i].extras) != true){
					
					copieddMetric.extras = Number(WIND.metrics[this.metricSelected].extras);
				
				//must be a string then
				}else{
				
					copieddMetric.extras = WIND.metrics[this.metricSelected].extras.toString();
				}
			}
		}
		
		WIND.metrics.push(copieddMetric);
		
		this.updateJSON();
		this.fillMetricsList();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
		
		
	}
}
//----------------------------------------------------------------------------------------------
//END COPY METRIC



//COPY OVERALL EFFECT
//makes a copy of an entire effect option in an event of the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.copyOverallEffect = function(){

	this.createUndo();
	
	var newEffect = {
		text	:	String(WIND.events[this.eventSelected].effects[this.effectSelected].text),
		ot		:	[],
		r		:	[]
	};
	
	var numOTeffects = WIND.events[this.eventSelected].effects[this.effectSelected].ot.length;
	for(var i=0;i<numOTeffects;i++){
	
		//is the effect an eGroup
		if(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][0] == 'g'){
	
			newEffect.ot.push(['g',Number(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][1])]);

		//is the effect a direct effect on a metric
		}else{
			
			newEffect.ot.push([Number(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][0]),String(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][1]),Number(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][2]),Number(WIND.events[this.eventSelected].effects[this.effectSelected].ot[i][3])]);
		}
	}
	
	var numReffects = WIND.events[this.eventSelected].effects[this.effectSelected].r.length;
	for(var i=0;i<numReffects;i++){
	
		//is the effect an eGroup
		if(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][0] == 'g'){
	
			newEffect.r.push(['g',Number(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][1])]);
	
		//is the effect a direct effect on a metric
		}else{

			newEffect.r.push([Number(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][0]),String(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][1]),Number(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][2]),Number(WIND.events[this.eventSelected].effects[this.effectSelected].r[i][3])]);
	
		}
	}
	
	WIND.events[this.eventSelected].effects.push(newEffect);
	
	var numEffects = WIND.events[this.eventSelected].effects.length;
	this.effectSelected = numEffects-1;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";	
}
//----------------------------------------------------------------------------------------------
//END COPY OVERALL EFFECT



//CREATE UNDO
//makes and stores a copy of the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.createUndo = function(){
	var numUndos = this.undos.length;
	if(numUndos < 10){
		this.undos.push(this.clone(WIND));
	}else{
		this.undos.splice(0,1);
		this.undos.push(this.clone(WIND));
	}
}
//----------------------------------------------------------------------------------------------
//END CREATE UNDO



//DISPLAY EVENT
//shows a mock display of an event for interaction by player
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.displayEvent = function(){

	this.simEvent = document.getElementById('simEventsList').selectedIndex;

	var html ='';	
	switch(Number(WIND.events[this.simEvent].type)){
	
		//happenstance
		case 0:
			html += '<h1>' + WIND.events[this.simEvent].name + '</h1>';
			html += '<p class="simMainText">' + this.displayText(WIND.events[this.simEvent].mText) + '</p>';
			html += '<p class="simEffectText">' + this.displayText(WIND.events[this.simEvent].effects[0].text) + '</p>';
			html += '<button onclick="WE.runEvent();">Run Event</button>';
			break;
			
		//multiple choice
		case 1:
			html += '<h1>' + WIND.events[this.simEvent].name + '</h1>';
			html += '<p class="simMainText">' + WIND.events[this.simEvent].mText + '</p>';
			var numEffects = WIND.events[this.simEvent].effects.length;
			for(var ef=0;ef<numEffects;ef++){		
				html += '<p class="simMainText">';		
				html += '<input type="radio" id="'+ef+'" name="multipleChoice" class="windInput" onclick=""/>';
				html += '<label for="'+ef+'"><span></span>' + WIND.events[this.simEvent].effects[ef].text + '</label>';
				html += '</p>';
			}
			html += '<button onclick="WE.runEvent();">Run Event</button>';
			break;
			
		//multiple selection
		case 2:
			html += '<h1>' + WIND.events[this.simEvent].name + '</h1>';
			html += '<p class="simMainText">' + WIND.events[this.simEvent].mText + '</p>';
			var numEffects = WIND.events[this.simEvent].effects.length;
			for(var ef=0;ef<numEffects;ef++){		
				html += '<p class="simMainText">';		
				html += '<input type="checkbox" id="'+ef+'" name="multipleSelection" class="windInput" onclick=""/>';
				html += '<label for="'+ef+'"><span></span>' + WIND.events[this.simEvent].effects[ef].text + '</label>';
				html += '</p>';
			}
			html += '<button onclick="WE.runEvent();">Run Event</button>';
			break;
			
		//slider
		case 3:
			//check player's history to see if event has happen before
			var numTurns = WIND.Player.history.length;
			var hasEventOccured = false;
			if(numTurns > 0){
				for(var e=0;e<numTurns;e++){
					if(WIND.Player.history[e].evt == this.simEvent){
						hasEventOccured = true;
						var effectOption = WIND.Player.history[e].opt;
			};};}; 
			
			if(hasEventOccured == false){
				var a = WIND.events[this.simEvent].effects[0].value;
				var b = WIND.events[this.simEvent].effects[1].value;
				//mid value of slider
				var effectOption = a + ((b  - a)/2);
			};
			
			html += '<h1>' + WIND.events[this.simEvent].name + '</h1>';
			html += '<p class="simMainText">' + WIND.events[this.simEvent].mText + '</p>';
			html += '<p><input type="range" min="' + WIND.events[this.simEvent].effects[0].value + '" max="' + WIND.events[this.simEvent].effects[1].value + '" value="' + effectOption + '"step="1" onchange="WE.showSliderValue(this.value)"/></p>';
			html += "<p id='sliderValue'>" + effectOption + "</p>";
			html += '<button onclick="WE.runEvent();">Run Event</button>';
			break;		
	}	

	document.getElementById("simContent").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END DISPLAY EVENT




//DISPLAY TEXT
//checks display text for metrics indicated by * and converts them to the metric values
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.displayText = function(checkText){
	//split mText into array separating metric values and text
	var mTextArray = [];
	mTextArray = checkText.split("*");
	var indexes = mTextArray.length;
	//check each index for metric
	//replace the metrics with their values
	var numMetrics = WIND.Player.metrics.length;
	for(var i=0;i<indexes;i++){
		for(var m=0;m<numMetrics;m++){
			if(mTextArray[i] == WIND.Player.metrics[m].name){
				mTextArray[i] = WIND.Player.metrics[m].value;
			}			
		}
	}
	var mTextString = mTextArray.join(" ");
	return mTextString;
}
//----------------------------------------------------------------------------------------------
//END DISPLAY TEXT




//EDIT eGROUP
//confirms changes to an eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.editeGroup = function(){

	if(document.getElementById("eGroupName").value != ""){			
		this.fill_eGroups();
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}	
}
//----------------------------------------------------------------------------------------------
//END EDIT eGROUP



//EDIT EVENT MAIN TEXT
//change the main text of an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.editEventMainText = function(){

	this.createUndo();

	WIND.events[this.eventSelected].mText = document.getElementById("eventMainText").value;
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END EDIT EVENT MAIN TEXT



//EDIT EVENT NAME
//change the name of an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.editEventName = function(){
	//if an event is selected
	if(this.eventSelected != -1){
	
		this.createUndo();
	
		WIND.events[this.eventSelected].name = document.getElementById("eventName").value;
		
		var html = "";
		var numEvents = WIND.events.length;
		for(var i=0;i<numEvents;i++){
			html += '<option>'+WIND.events[i].name+'</option>';
		}
		document.getElementById("eventsList").innerHTML = html;
		
		document.getElementById("eventsList").selectedIndex = this.eventSelected;
		
		this.fillEventsData();
	
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";	
	}
}
//----------------------------------------------------------------------------------------------
//END EDIT EVENT NAME



//EDIT METRIC
//confirms the editing of a metric
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.editMetric = function(){
	if(document.getElementById("metricName").value != "" && document.getElementById("metricValue").value != ""){
	
		this.createUndo();
	
		var editedMetric = {
			name	:	document.getElementById("metricName").value,
			value	:	document.getElementById("metricValue").value,
			neg		:	true
		};
		
		//is allow negative checked?
		if(document.getElementById("allowNeg").checked != true){
			editedMetric.neg = false;
		}
		
		//is there extras?
		if(document.getElementById("extras").value != ""){
			//is it an object?
			if(document.getElementById("extras").value.charAt(0) == "{"){
				var obj = JSON.parse(document.getElementById("extras").value);
				editedMetric.extras = obj;
			
			}else{
				editedMetric.extras = document.getElementById("extras").value;
			}
		}
		
		WIND.metrics[this.metricSelected] = editedMetric;
		
		this.updateJSON();
		this.fillMetricsList();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END EDIT METRIC



//EDIT REPEAT LIMIT
//change the repeat limit for an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.editRepeatLimit = function(){

	if(this.eventSelected != -1){
	
		this.createUndo();

		if(document.getElementById('repeatLimit').value == ''){
		
			WIND.events[this.eventSelected].repeatLimit = undefined;
		
		}else{
		
			WIND.events[this.eventSelected].repeatLimit = Number(document.getElementById('repeatLimit').value);
		}
	
		this.fillEventsData();
	
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END EDIT REPEAT LIMIT



//eGROUP SELECT
//change the selected eGroup for editing
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.eGroupSelect = function(which){
	var numeGroups = WIND.eGroups.length;
	for(var i=0;i<numeGroups;i++){
		document.getElementById("eGroupList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected_wind";
	var eGroupNum = which.id.slice(11);
	this.eGroupSelected = Number(eGroupNum);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editeGroup"){
		this.fillEffectsData("g");
	}
}
//----------------------------------------------------------------------------------------------
//END eGROUP SELECT



//EXPORT WIND
//saves the WIND object to a .js text file
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.exportWIND = function()
{
	
	var textToWrite = "WIND = " + JSON.stringify(WIND);
	
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = document.getElementById("saveFileName").value;

	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs+".js";
	downloadLink.innerHTML = "Download File";
	if (window.webkitURL != null)
	{
		// Chrome allows the link to be clicked
		// without actually adding it to the DOM.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	}
	else
	{
		// Firefox requires the link to be added to the DOM
		// before it can be clicked.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = WE.removeExportWINDLink;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
	
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END EXPORT WIND



//FILL EFFECTS DATA
//updates the effects menu with dynamic data
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillEffectsData = function(whichEffects){

	if(whichEffects == "ot"){
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
		var numEffects = WIND.events[this.eventSelected].effects[this.effectSelected].ot.length;
	}else if(whichEffects == "r"){
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
		var numEffects = WIND.events[this.eventSelected].effects[this.effectSelected].r.length;
	}else if(whichEffects == "g"){
		var effectsArray = WIND.eGroups[this.eGroupSelected].e;
		var numEffects = WIND.eGroups[this.eGroupSelected].e.length;
	}

	//effects array
	//[0 - metricID, 1 - sign, 2 - type, 3 - value]
	var html = '';	
	var aOrB = "rowA";
	for(var i=0;i<numEffects;i++){
		html += '<tr class="' + aOrB + '">';
		
		//if this is in effects of an event
		if(whichEffects != "g"){
		
			html += '<th class="selectionCell"><select class="dropdownType" id="' + whichEffects + "_meg_" + String(i) + '" onchange="WE.changeMetricoreGroup(this);">';
			html += this.fillWithMetricoreGroup();
			html += '</select></th>';
			
		//is this is effect in an eGroup
		}else if(whichEffects == "g"){
		
			html += '<th class="selectionCell"></th>';
		}
		
		html += '<th class="mathCell"></th>';
		
		//is this a metric
		if(effectsArray[i][0] != "g"){
		
			html += '<th class="selectionCell"><select class="dropdownType" id="' + whichEffects + "_type_" + String(i) + '" onchange="WE.changeType(this);">';
			html += this.fillWithTypes();
			html += '</select></th>';
			html += '<th class="buttonCell"><button id="' + whichEffects + String(i) + '" class="rightButton" onClick="WE.removeEffect(this);" style="border:1px solid #999999;">Remove Effect</button></th></tr>';
			html += '<tr class="' + aOrB + '">';
			html += '<td class="selectionCell"><select class="dropdownEffects" id="' + whichEffects + "_metric_" + String(i) + '" onchange="WE.updateEffects();">';
			html += this.fillWithMetrics();
			html += '</select></td>';
			html += '<td class="mathCell"><select class="dropdownMath" id="' + whichEffects + "_sign_" + String(i) + '" onchange="WE.updateEffects();">';
			html += this.fillWithSigns();
			html += '</select></td>';
		
		//is this an eGroup
		}else if(effectsArray[i][0] == "g"){
			
			html += '<th class="selectionCell"></th>';
			html += '<th class="buttonCell"><button id="' + whichEffects + String(i) + '" class="rightButton" onClick="WE.removeEffect(this);" style="border:1px solid #999999;">Remove Effect</button></th></tr>';
			html += '<tr class="' + aOrB + '">';
			html += '<td class="selectionCell"><select class="dropdownEffects" id="' + whichEffects + "_eGroup_" + String(i) + '" onchange="WE.updateEffects();">';
			html += this.fillWitheGroups();
			html += '</select></td>';
			html += '<td class="mathCell"></td>';

		}
		
		//is this a metric
		if(effectsArray[i][0] != "g"){
			//type
			switch(effectsArray[i][2]){
		
				//metric
				case 0:
					html += '<td class="selectionCell"><select class="dropdownEffects" id="' + whichEffects + "_value_" + String(i) + '" onchange="WE.updateEffects();">';
					html += this.fillWithMetrics();
					html += '</select></td>';
					break;
				
				//number
				case 1:
					html += '<td class="selectionCell"><input class="verticalFill" type="text" id="' + whichEffects + "_value_" + String(i) + '" value="' + effectsArray[i][3] + '" style="width:150px;" onblur="WE.updateEffects();" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');"/></td>';
					break;
				
				//compound
				case 2:
					html += '<td class="selectionCell"><input class="verticalFill" type="text" id="' + whichEffects + "_value_" + String(i) + '" value="' + effectsArray[i][3] + '" style="width:150px;" onblur="WE.updateEffects();" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');"/></td>';
					break;
				
				default:
					html += '<td class="selectionCell"><input class="verticalFill" type="text" id="' + whichEffects + "_value_" + String(i) + '" value="' + effectsArray[i][3] + '" style="width:150px;" onblur="WE.updateEffects();" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');"/></td>';
					break;
			}
		
		//is this an eGroup
		}else if(effectsArray[i][0] == "g"){
			
			html += '<td class="selectionCell"></td>';
		
		}
		
		html += '<td class="buttonCell"></td></tr>';
		if(aOrB == "rowA"){
			aOrB = "rowB";
		}else{
			aOrB = "rowA";
		}				
	}
	
	if(whichEffects == "ot"){
		document.getElementById("oneTimeEffects").innerHTML = html;
	}else if(whichEffects == "r"){
		document.getElementById("recurringEffects").innerHTML = html;
	}else if(whichEffects == "g"){
		document.getElementById("eGroupEffects").innerHTML = html;
	}
	
	
	//set the dropdowns to the proper index
	for(var i=0;i<numEffects;i++){
	
		//is this a metric
		if(effectsArray[i][0] != "g"){
		
			//if this is in effects of an event
			if(whichEffects != "g"){
		
				//metric or eGroup
				document.getElementById(whichEffects + "_meg_"+String(i)).selectedIndex = 0;
				
			}
			
			//metric
			document.getElementById(whichEffects + "_metric_"+String(i)).selectedIndex = effectsArray[i][0];
			
			//type
			switch(effectsArray[i][2]){
		
				//metric
				case 0:
					document.getElementById(whichEffects + "_type_"+String(i)).selectedIndex = 0;
					document.getElementById(whichEffects + "_value_"+String(i)).selectedIndex = effectsArray[i][3];
					break;
				//number	
				case 1:
					document.getElementById(whichEffects + "_type_"+String(i)).selectedIndex = 1;
					break;
			
				//compound	
				case 2:
					document.getElementById(whichEffects + "_type_"+String(i)).selectedIndex = 2;
					break;
				
				default:
					document.getElementById(whichEffects + "_type_"+String(i)).selectedIndex = 1;
					break;
			}
			//sign
			switch(effectsArray[i][1]){
				case "=":
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 0;
					break;
				case "+":
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 1;
					break;
				case "-":
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 2;
					break;
				case "*":
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 3;
					break;
				case "/":
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 4;
					break;
				default:
					document.getElementById(whichEffects + "_sign_"+String(i)).selectedIndex = 0;
					break;
			}
			
		//is this an eGroup
		}else if(effectsArray[i][0] == "g"){
		
			//metric or eGroup
			document.getElementById(whichEffects + "_meg_"+String(i)).selectedIndex = 1;
		
			//eGroup
			document.getElementById(whichEffects + "_eGroup_"+String(i)).selectedIndex = effectsArray[i][1];
		
		}
	}
}
//----------------------------------------------------------------------------------------------
//END FILL EFFECTS DATA



//FILL eGROUPS
//update HTML with eGroup data
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fill_eGroups = function(){
	if(WIND.eGroups != undefined){
		var html = "";
		var numeGroups = WIND.eGroups.length;
		for(var i=0;i<numeGroups;i++){
			html += '<button type="button" class="button_unselected" id="eGroupList_'+i+'" onclick="WE.eGroupSelect(this);" ondblclick="WE.popUps(\'editeGroup\');"><span class="butName">'+WIND.eGroups[i].name+'</span><span class="butValue">'+WIND.eGroups[i].e.length+'</span></button>';
		}
		
	}else{
		
		var html = "";
	
	}
	
	document.getElementById("eGroupsList").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END FILL eGROUPS



//FILL EVENTS DATA
//update HTML with event data
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillEventsData = function(){

	var html = "";
	var numEvents = WIND.events.length;
	
	if(numEvents > 0){
	
		for(var i=0;i<numEvents;i++){
			html += '<option>'+WIND.events[i].name+'</option>';
		}
		document.getElementById("eventsList").innerHTML = html;
	
		//which event is selected and being displayed
		if(this.eventSelected == -1 && numEvents > 0){
	
			this.eventSelected = 0;
		
		}else if(numEvents > 0 && this.eventSelected < numEvents){
		
			//keep this.eventSelected that way it is
	
		}else{
			this.eventSelected = -1;
		}
	
		//if an event is selected
		if(this.eventSelected != -1){
	
			document.getElementById("eventsList").selectedIndex = this.eventSelected;
			document.getElementById("eventName").value = WIND.events[this.eventSelected].name;
			document.getElementById("eventType").selectedIndex = WIND.events[this.eventSelected].type;
			document.getElementById("eventMainText").value = WIND.events[this.eventSelected].mText;
		
			var numEffects = WIND.events[this.eventSelected].effects.length;
			html = "";
			for(var e=0;e<numEffects;e++){
				html += '<option>'+e+'</option>';
			}
			document.getElementById("effectsList").innerHTML = html;
		
			//which effect is selected
			if(this.effectSelected == -1 && numEffects > 0){
	
				this.effectSelected = 0;
		
			}else if(numEffects > 0 && this.effectSelected < numEffects){
		
				//keep this.effectSelected the way it is
	
			}else{
		
				this.effectSelected = 0;
		
			}
			document.getElementById("effectsList").selectedIndex = this.effectSelected;
		
			//effects buttons
			//depending on which type of event
			switch(WIND.events[this.eventSelected].type){
				//happenstance
				case 0:
					html = '<button onclick="WE.popUps(\'editEffect\');">Edit</button>';
					break;
				//multiple choice
				case 1:
					html = '<button onclick="WE.popUps(\'addOverallEffect\');">Add</button><button onclick="WE.removeOverallEffect()">Remove</button><button onclick="WE.popUps(\'editEffect\');">Edit</button><button onclick="WE.copyOverallEffect()">Copy</button>';
					break;
				//multiple selection
				case 2:
					html = '<button onclick="WE.popUps(\'addOverallEffect\');">Add</button><button onclick="WE.removeOverallEffect()">Remove</button><button onclick="WE.popUps(\'editEffect\');">Edit</button><button onclick="WE.copyOverallEffect()">Copy</button>';
					break;
				//slider
				case 3:
					html = '<button onclick="WE.popUps(\'editEffect\');">Edit</button>';
					break;		
			}
			document.getElementById("effectsButtons").innerHTML = html;

		}
		
		
		//PREREQUISITES
		if(WIND.events[this.eventSelected].prerequisites != undefined){
			var numPrerequisites = WIND.events[this.eventSelected].prerequisites.length;
			var html = '';
			for(var p=0;p<numPrerequisites;p++){
				html += '<div class="prerequisiteBlock"><select id="pre_'+p+'" class="prerequisites_dropDown" onchange="WE.changePrerequisite(this)">';
				var numEvents = WIND.events.length;
				for(var e=0;e<numEvents;e++){
					html += '<option>'+ WIND.events[e].name+'</option>';
				}
		
				html += '</select><button id="remove_pre_'+p+'" onclick="WE.removePrerequisite(this);">Remove</button>';
				
				html += '<div><input type="checkbox" id="ma_'+p+'" class="windInput" onclick="WE.changeMatchAmounts(this);"/>';
				html += '<label for="ma_'+p+'"><span></span>Match Amount</label></div></div>';
			}
			document.getElementById('prerequisitesHouse').innerHTML = html;
			
			//set the drop downs
			for(var p=0;p<numPrerequisites;p++){
				document.getElementById("pre_"+p).selectedIndex = WIND.events[this.eventSelected].prerequisites[p];
			}
			
			//set the match amounts checkboxes
			for(var p=0;p<numPrerequisites;p++){
				if(WIND.events[this.eventSelected].prerequisiteMatchAmounts[p] == undefined || WIND.events[this.eventSelected].prerequisiteMatchAmounts[p] == false){
					document.getElementById("ma_"+p).checked = false;
				}else{
					document.getElementById("ma_"+p).checked = true;
				}
			}			
		}else{
			document.getElementById('prerequisitesHouse').innerHTML = '';
		}
		
		
		//REPEAT LIMIT
		if(WIND.events[this.eventSelected].repeatLimit == undefined){
		
			document.getElementById('repeatLimit').value = '';
		
		}else{
		
			document.getElementById('repeatLimit').value = WIND.events[this.eventSelected].repeatLimit;
		}		
		
		//SIM EVENTS LIST
		html = '';
		for(var i=0;i<numEvents;i++){
			html += '<option>'+WIND.events[i].name+'</option>';
		}
		document.getElementById('simEventsList').innerHTML = html;
	
	//there are no events
	}else{
	
		this.eventSelected = -1;
		document.getElementById("eventsList").innerHTML = '';
		document.getElementById("eventName").value = '';
		document.getElementById("eventMainText").value = '';
		document.getElementById("effectsList").innerHTML = '';
		document.getElementById('prerequisitesHouse').innerHTML = '';
		document.getElementById('repeatLimit').value = '';
		document.getElementById('simEventsList').innerHTML = '';
	
	}
}
//----------------------------------------------------------------------------------------------
//END FILL EVENTS DATA



//FILL METRIC LIST
//update HTML with metric data
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillMetricsList = function(){

	var html = "";
	var numMetrics = WIND.metrics.length;
	for(var i=0;i<numMetrics;i++){
		html += '<button style="height:25px;margin-top:5px;" type="button" class="button_unselected" id="metricsList_'+i+'" onclick="WE.metricSelect(this)" ondblclick="WE.popUps(\'editMetric\');"><span class="butName">'+WIND.metrics[i].name+'</span><span class="butValue">'+WIND.metrics[i].value+'</span></button>';
	}
	document.getElementById("metricsList").innerHTML = html;
	
	//add to Player's metrics
	html = '';
	var numMetrics = WIND.metrics.length;
	for(var i=0;i<numMetrics;i++){
		html += '<div class="pmListItem"><div class="butName">'+WIND.metrics[i].name+'</div><div class="butValue">'+WIND.metrics[i].value+'</div>';
		html += '<div class="butView">';
		html += '<input type="checkbox" id="pm_'+i+'" name="pms" class="windInput" onclick="WE.changePMSview();"/>';
		html += '<label for="pm_'+i+'"><span></span></label>';
		html += '</div>';
		html += '</div>';
	}
	document.getElementById("playerMetricsList").innerHTML = html;
	
	var group = document.getElementsByName('pms');
	for (var i=0;i<group.length;i++) {
		//0 - means not showing, 1 - means showing
		if (this.PlayerMeticsView[i] == 1) {
			document.getElementById("pm_"+i).checked = true;
		}else{
			document.getElementById("pm_"+i).checked = false;
		}
	}
	
	//add to the simOverlay
	html = "";
	for(var i=0;i<numMetrics;i++){
		if(this.PlayerMeticsView[i] == 1){
			html += '<div class="simMetric" id="simMetric_'+i+'">';
			html += '<span class="simMetric_name" id="'+WIND.metrics[i].name+'">';
			html += WIND.metrics[i].name;
			html += '</span>';
			html += '<span class="simMetric_value" id="'+WIND.metrics[i].name+'_value">';
			html += WIND.metrics[i].value;
			html += '</span>';
			html += '</div>';
		}
	}
	document.getElementById("simMetrics").innerHTML = html;
	
	this.metricSelected = -1;
	
	document.getElementById("numDecimals").value = WIND.decimals;
	
	//reinitialize the Player
	WIND.initPlayer();
	WE.updateJSON();
}
//----------------------------------------------------------------------------------------------
//END FILL METRIC LIST



//FILL WITH eGROUPS
//fills eGroups options in effects menu
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillWitheGroups = function(){
	if(WIND.eGroups != undefined && WIND.eGroups.length > 0){
		var numeGroups = WIND.eGroups.length;
		var html = '';		
		for(var i=0;i<numeGroups;i++){
			html += '<option value="'+WIND.eGroups[i].name+'">'+WIND.eGroups[i].name+'</option>';
		}
		return html;
	}
}
//----------------------------------------------------------------------------------------------
//END FILL WITH eGROUPS



//FILL WITH METRICS
//fills metric options in effects menu
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillWithMetrics = function(){
	var numMetrics = WIND.metrics.length;
	var html = '';		
	for(var i=0;i<numMetrics;i++){
		html += '<option value="'+WIND.metrics[i].name+'">'+WIND.metrics[i].name+'</option>';
	}
	return html;
}
//----------------------------------------------------------------------------------------------
//END FILL WITH METRICS



//FILL WITH METRICS OR eGROUPS
//fills metric or eGroup option in effects menu
//---------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillWithMetricoreGroup = function(){
	var html = '';
	html += '<option value="singular">Metric</option>';
	html += '<option value="eGroup">eGroup</option>';
	return html;
}
//----------------------------------------------------------------------------------------------
//END FILL WITH METRICS OR eGROUPS



//FILL WITH SIGNS
//fills signs options in effects menu
//---------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillWithSigns = function(){
	var html = '';
	html += '<option value="=">=</option>';
	html += '<option value="+">+</option>';
	html += '<option value="-">-</option>';
	html += '<option value="*">*</option>';
	html += '<option value="/">/</option>';
	return html;
}
//----------------------------------------------------------------------------------------------
//END FILL WITH SIGNS



//FILL WITH TYPES
//fills type options in effects menu
//---------------------------------------------------------------------------------------------
WINDEDITOR.prototype.fillWithTypes = function(){
	var html = '';
	html += '<option value="Metric">Metric</option>';
	html += '<option value="Number">Number</option>';
	/*html += '<option value="Compound">Compound</option>';*/
	return html;
}
//----------------------------------------------------------------------------------------------
//END FILL WITH TYPES



//FINISH EDIT EVENT
//update after editing of an event in the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.finishEditEvent = function(){
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END FINISH EDIT EVENT



//IMPORT WIND
//imports a WIND.js file
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.importWIND = function(){

	var fileToLoad = document.getElementById("fileToLoad").files[0];
	var fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) 
	{
		WE.createUndo();
		
		var textFromFileLoaded = fileLoadedEvent.target.result;
		eval(textFromFileLoaded);
		
		//give WIND back all of it's functions
		//by making it a FLAGWIND object
		var tempWIND = new FLAGWIND();
		if(WIND.metrics != undefined){tempWIND.metrics = WIND.metrics;};
		if(WIND.events != undefined){tempWIND.events = WIND.events;};
		if(WIND.eGroups != undefined){tempWIND.eGroups = WIND.eGroups;};
		if(WIND.decimals != undefined){tempWIND.decimals = WIND.decimals;};
		WIND = tempWIND;
		tempWIND = null;
	
		WE.loadWIND();
	
	
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	};
	fileReader.readAsText(fileToLoad, "UTF-8");
}
//----------------------------------------------------------------------------------------------
//END IMPORT WIND



//LOAD WIND
//called after a WIND.js is imported
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.loadWIND = function(){
	if(this.reloadTimeOut == 0){
		this.reloadTimeOut = 1;
		
		this.updateJSON();
		
		//add a slot for each metric
		var numMetrics = WIND.metrics.length;
		this.PlayerMeticsView = [];
		for(var m=0;m<numMetrics;m++){
			this.PlayerMeticsView.push(0);
		}
		
		//use FLAG.Tween to fade the whiteGlass
		document.getElementById("whiteGlass").style.visibility = "visible";
		FLAG.Tween(document.getElementById("whiteGlass"),"opacity",1,.5);
		//wait a second for fade to white
		setTimeout(function(){
			FLAG.loadScene(0,WE.sceneLoaded);
		
			//put the progressBar in the center of the screen
			document.getElementById("progressBar").style.left = ((window.innerWidth/2) - 100) + "px";
			document.getElementById("progressBar").style.top = ((window.innerHeight/2) - 150) + "px";
			document.getElementById("loadProgress_wind").style.width = "0%";
			document.getElementById("progressBar").style.visibility = "visible";
			document.getElementById("loadProgressText").innerHTML = "0%";
			//periodically the showLoadProgress function
			WE.loadInterval = setInterval(function(){WE.showLoadProgress();},250);
			
			WE.resetSim();
		},750);
	}
}
//----------------------------------------------------------------------------------------------
//END LOAD WIND



//MENUS
//Control the display of menus
//------------------------------------------------------------------
WINDEDITOR.prototype.menus = function(which){
	document.getElementById("m_metrics").style.color = "#333333";
	document.getElementById("m_metrics").style.backgroundColor = "#999999";
	document.getElementById("metrics").style.visibility = "hidden";
	document.getElementById('metrics').style.overflowY = "hidden";
	document.getElementById("m_events").style.color = "#333333";
	document.getElementById("m_events").style.backgroundColor = "#999999";
	document.getElementById("events").style.visibility = "hidden";
	document.getElementById('events').style.overflowY = "hidden";
	document.getElementById("m_eGroups").style.color = "#333333";
	document.getElementById("m_eGroups").style.backgroundColor = "#999999";
	document.getElementById("eGroups").style.visibility = "hidden";
	document.getElementById('eGroups').style.overflowY = "hidden";
	document.getElementById("m_simulator").style.color = "#333333";
	document.getElementById("m_simulator").style.backgroundColor = "#999999";
	document.getElementById("simulator").style.visibility = "hidden";
	document.getElementById('simulator').style.overflowY = "hidden";

	switch(which){
		case "metrics":
			document.getElementById("m_metrics").style.color = "#666666";
			document.getElementById("m_metrics").style.backgroundColor = "#f9f9f9";
			document.getElementById("metrics").style.visibility = "inherit";
			document.getElementById('metrics').style.overflowY = "auto";
			break;
		case "events":
			document.getElementById("m_events").style.color = "#666666";
			document.getElementById("m_events").style.backgroundColor = "#f9f9f9";
			document.getElementById("events").style.visibility = "inherit";
			document.getElementById('events').style.overflowY = "auto";
			break;
		case "eGroups":
			document.getElementById("m_eGroups").style.color = "#666666";
			document.getElementById("m_eGroups").style.backgroundColor = "#f9f9f9";
			document.getElementById("eGroups").style.visibility = "inherit";
			document.getElementById('eGroups').style.overflowY = "auto";
			break;
		case "simulator":
			document.getElementById("m_simulator").style.color = "#666666";
			document.getElementById("m_simulator").style.backgroundColor = "#f9f9f9";
			document.getElementById("simulator").style.visibility = "inherit";
			document.getElementById('simulator').style.overflowY = "auto";
			break;
	}
	
	//hide menu bar menus
	this.menuBar_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END MENUS



//MENU BAR DROP DOWNS
//Control the display of drop down menus from the top menu bar
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.menuBar_dropDowns = function(which){
	document.getElementById("mB_file").style.backgroundColor = "#999999";
	document.getElementById("mB_file").style.color = "#333333";
	document.getElementById("mB_view").style.backgroundColor = "#999999";
	document.getElementById("mB_view").style.color = "#333333";
	document.getElementById("mB_edit").style.backgroundColor = "#999999";
	document.getElementById("mB_edit").style.color = "#333333";
	document.getElementById("mBdD_file").style.visibility = "hidden";
	document.getElementById("mBdD_view").style.visibility = "hidden";
	document.getElementById("mBdD_edit").style.visibility = "hidden";

	switch(which){
		case "file":
			document.getElementById("mB_file").style.backgroundColor = "#f9f9f9";
			document.getElementById("mB_file").style.color = "#666666";
			document.getElementById("mBdD_file").style.visibility = "visible";
			break;	
		case "view":
			document.getElementById("mB_view").style.backgroundColor = "#f9f9f9";
			document.getElementById("mB_view").style.color = "#666666";
			document.getElementById("mBdD_view").style.visibility = "visible";
			break;	
		case "edit":
			document.getElementById("mB_edit").style.backgroundColor = "#f9f9f9";
			document.getElementById("mB_edit").style.color = "#666666";
			document.getElementById("mBdD_edit").style.visibility = "visible";
			break;
		default:
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END MENU BAR DROP DOWNS



//METRIC SELECT
//selecting of metrics from metric menu
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.metricSelect = function(which){
	var numMetrics = WIND.metrics.length;
	for(var i=0;i<numMetrics;i++){
		document.getElementById("metricsList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected_wind";
	var metricNum = which.id.slice(12);
	this.metricSelected = Number(metricNum);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editMetric"){
		document.getElementById("metricName").value = WIND.metrics[this.metricSelected].name;
		document.getElementById("metricValue").value = WIND.metrics[this.metricSelected].value;
	}
}
//----------------------------------------------------------------------------------------------
//END METRIC SELECT



//OPEN CLOSE SECTION
//collapse sections of menus
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.openCloseSection = function(which){
	var sectionName = which.id.slice(15);
	if(window.getComputedStyle(document.getElementById("section_"+sectionName)).getPropertyValue('height') != "20px"){
		document.getElementById("section_"+sectionName).style.height = "20px";
		which.firstChild.style.backgroundPosition = "-0px -160px";
	}else{
		document.getElementById("section_"+sectionName).style.height = "auto";
		which.firstChild.style.backgroundPosition = "-7px -160px";
	}
	
	//hide menu bar menus
	this.menuBar_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END OPEN CLOSE SECTION



//OPEN WIND
//shows the WIND JSON in a new browser window
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.openWIND = function(){
	var newWin = window.open('','','');
	newWin.document.write('<title>WIND JSON Object</title>' + document.getElementById("JSON").innerHTML);
	newWin.focus();
}
//----------------------------------------------------------------------------------------------
//END OPEN WIND



//POPUPS
//Control the display of pop up menus
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.popUps = function(which){

	document.getElementById("popUp").style.visibility = "hidden";
	
	//hide menu bar menus
	this.menuBar_dropDowns("none");	
	
	switch(which){
		
		//METRICS
		//------------------------------------------------------------------
		case "addMetric":
			var html = '<div id="popUpContent">';
			html += '<h2>Metric Name:</h2>'
			html += '<input class="wideBox" type="text" id="metricName" value="">';
			html += '<h2>Metric Value:</h2>'
			html += '<input class="wideBox" type="text" id="metricValue" value="" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');">';
			html += '<h2>Extras:</h2>'
			html += '<textarea class="textArea" id="extras" value=""></textarea>';
			html += '<div><input type="checkbox" id="allowNeg" name="allowNeg" class="windInput" onclick="" checked/>';
			html += '<label for="allowNeg"><span></span>Allow Negative</label></div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="WE.addMetric()">Ok</button><button onclick="WE.popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addMetric";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("metricName").focus();
			},10);
			break;
			
		case "editMetric":
			if(this.metricSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Metric Name:</h2>'
				html += '<input class="wideBox" type="text" id="metricName" value="'+WIND.metrics[this.metricSelected].name+'">';
				html += '<h2>Metric Value:</h2>'
				html += '<input class="wideBox" type="text" id="metricValue" value="'+WIND.metrics[this.metricSelected].value+'" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');">';
				html += '<h2>Extras:</h2>'
				html += '<textarea class="textArea" id="extras" value=""></textarea>';
				html += '<div><input type="checkbox" id="allowNeg" name="allowNeg" class="windInput" onclick="" checked/>';
				html += '<label for="allowNeg"><span></span>Allow Negative</label></div>';
			
				html += '<hr>';
			
				html += '<div class="okCancelButs">';
				html += '<button onclick="WE.editMetric()">Ok</button><button onclick="WE.popUps(\'none\')">Cancel</button>';
				html += '</div>';
			
				html += '</div>';
				//end popUpContent
			
				document.getElementById("popUp").className = "editMetric";
				document.getElementById("popUp").innerHTML = html;
				
				//allow negative
				if(WIND.metrics[this.metricSelected].neg != undefined){
					if(WIND.metrics[this.metricSelected].neg == false){
						document.getElementById("allowNeg").checked = false;
					}	
				}
				
				if(WIND.metrics[this.metricSelected].extras != undefined){
					
					//are the extras an Object
					if(typeof WIND.metrics[this.metricSelected].extras == "object"){
					
						var string = JSON.stringify(WIND.metrics[this.metricSelected].extras);
						document.getElementById("extras").value = string;
					
					}else{
					
						document.getElementById("extras").value = WIND.metrics[this.metricSelected].extras;
					}
				}
			
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					WE.centerPopUp();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("metricName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END METRICS	
		
		
		//EFFECTS
		//------------------------------------------------------------------
		//for multiple choice and multiple selection events only
		case "addOverallEffect":
			var numEffects = WIND.events[this.eventSelected].effects.length;
			var html = '<div id="popUpContent" style="width:580px;">';
			html += '<h2>Effect '+numEffects+'</h2>'
			html += '<h2>Text:</h2>'
			html += '<textarea class="textArea" id="effectText" value="" style="width:560px;height:100px;max-width:560px;" onblur="WE.updateEffects();"></textarea>';
			
			html += '<hr style="width:560px;">';
			
			//one time effects
			html += '<div class="effectsHouse">';
			html += '<h2>One Time Effects:</h2>'
			html += '<table id="oneTimeEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_ot" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			//recurring effects
			html += '<div class="effectsHouse">';
			html += '<h2>Recurring Effects:</h2>'
			html += '<table id="recurringEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_r" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			html += '<hr style="width:560px;">';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="WE.finishEditEvent();WE.fillEventsData();">Ok</button><button onclick="WE.undo();">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addOverallEffect";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				WE.createUndo();
				
				//add effect to WIND
				WIND.events[WE.eventSelected].effects.push({
					text:'',
					ot:[],
					r:[]
				});
				 
				WE.effectSelected = numEffects;
				 
				WE.updateJSON();
				
				document.getElementById("popUp").style.width = "580px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("effectText").focus();
			},10);
			break;
			
		case "editEffect":
			var html = '<div id="popUpContent" style="width:580px;">';
			html += '<h2>Effect '+this.eventSelected+'</h2>'
			html += '<h2>Text:</h2>'
			html += '<textarea class="textArea" id="effectText" value="" style="width:560px;height:100px;max-width:560px;" onblur="WE.updateEffects();"></textarea>';
			
			html += '<hr style="width:560px;">';
			
			//is the event a slider event?
			if(WIND.events[this.eventSelected].type == 3){
				//add a value input
				html += '<h2>Value:</h2>'
				html += '<input class="wideBox" type="text" id="sliderValue" style="width:150px;" onblur="WE.updateEffects();" onkeypress="return WE.restrictCharacters(this, event, \'posNegInteger\');">';
				html += '<hr style="width:560px;">';
			}
			
			//one time effects
			html += '<div class="effectsHouse">';
			html += '<h2>One Time Effects:</h2>'
			html += '<table id="oneTimeEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_ot" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			//recurring effects
			html += '<div class="effectsHouse">';
			html += '<h2>Recurring Effects:</h2>'
			html += '<table id="recurringEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_r" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			html += '<hr style="width:560px;">';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="WE.finishEditEvent()">Ok</button><button onclick="WE.undo()">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "editEffect";
			document.getElementById("popUp").innerHTML = html;
			
			document.getElementById("effectText").value = WIND.events[this.eventSelected].effects[this.effectSelected].text;
			
			if(WIND.events[this.eventSelected].type == 3){
				document.getElementById("sliderValue").value = WIND.events[this.eventSelected].effects[this.effectSelected].value;
			}
			
			this.fillEffectsData("ot");
			this.fillEffectsData("r");
			
			setTimeout(function(){
				WE.createUndo();
				document.getElementById("popUp").style.width = "580px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("effectText").focus();
			},10);
			break;
		
		//------------------------------------------------------------------
		//END EFFECTS	
		
		
		//eGroups
		//------------------------------------------------------------------
		case "addeGroup":
			var html = '<div id="popUpContent" style="width:580px;">';
			html += '<h2>eGroup Name:</h2>'
			html += '<input class="wideBox" type="text" id="eGroupName" value="" style="width:560px;" onblur="WE.updateEffects();">';
			
			html += '<hr style="width:560px;">';
			
			//one time effects
			html += '<div class="effectsHouse">';
			html += '<h2>Effects:</h2>'
			html += '<table id="eGroupEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_eGroup" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			html += '<hr style="width:560px;">';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="WE.addeGroup();">Ok</button><button onclick="WE.undo();">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addeGroup";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				WE.createUndo();
				
				if(WIND.eGroups == undefined){
					WIND.eGroups = [];
				}
				
				var numeGroups = WIND.eGroups.length;
				
				//add an eGroup to WIND
				WIND.eGroups.push({
					name:'',
					e:[]
				});
				 
				WE.eGroupSelected = numeGroups;
				 
				WE.updateJSON();
				
				document.getElementById("popUp").style.width = "580px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("eGroupName").focus();
			},10);
			break;
			
		case "editeGroup":
			var html = '<div id="popUpContent" style="width:580px;">';
			html += '<h2>eGroup Name:</h2>'
			html += '<input class="wideBox" type="text" id="eGroupName" value="'+ WIND.eGroups[this.eGroupSelected].name +'" style="width:560px;" onblur="WE.updateEffects();">';
			
			html += '<hr style="width:560px;">';
			
			//one time effects
			html += '<div class="effectsHouse">';
			html += '<h2>Effects:</h2>'
			html += '<table id="eGroupEffects" class="effectsTable">';
			html += '</table>';
			html += '<button id="addEffect_eGroup" onclick="WE.addEffect(this)" class="rightButton">Add Effect</button>';
			html += '</div>';
			
			html += '<hr style="width:560px;">';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="WE.editeGroup();">Ok</button><button onclick="WE.undo();">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "editeGroup";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				WE.createUndo();	
							 
				WE.fillEffectsData("g");
				
				WE.updateJSON();
								
				document.getElementById("popUp").style.width = "580px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("eGroupName").focus();
			},10);
			break;
		
		//------------------------------------------------------------------
		//END eGroups	
		
			
		//WIND
		//------------------------------------------------------------------
		case "importJSON":
			var html = '<div id="popUpContent">';
			html += '<h2>Select File:</h2>';
			html += '<input type="file" id="fileToLoad"></input>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';	
			html += '<button onclick="WE.importWIND()">Ok</button><button onclick="WE.popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent		
			
			document.getElementById("popUp").className = "importPOLE";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
			},10);
			break;
			
		case "exportJSON":
			var html = '<div id="popUpContent">';
			html += '<h2>File Name:</h2><br><input type="text" id="saveFileName" value="WIND" style="width:380px;margin-left:0px;margin-bottom:5px;">';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';	
			html += '<button onclick="WE.exportWIND()" id="okAddImage">Ok</button><button onclick="WE.popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent	
			
			document.getElementById("popUp").className = "exportJSON";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				WE.centerPopUp();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("saveFileName").focus();
			},10);
			break;	
		//------------------------------------------------------------------
		//END WIND
		
		default:
			document.getElementById("popUp").style.width = "400px";
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END POPUPS



//REMOVE EFFECT
//removes an effect fro either an event or an eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeEffect = function(whichBut){
	//remove an effect from the proper array
	if(whichBut.id.charAt(0) == "o"){
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
		//grab the Number
		var num = Number(whichBut.id.slice(2));
		effectsArray.splice(num,1);
		this.fillEffectsData("ot");
		FLAG.Scene.resize();
	}else if(whichBut.id.charAt(0) == "r"){
		var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
		//grab the Number
		var num = Number(whichBut.id.slice(1));
		effectsArray.splice(num,1);
		this.fillEffectsData("r");
		FLAG.Scene.resize();
	}else if(whichBut.id.charAt(0) == "g"){
		//grab the Number
		var num = Number(whichBut.id.slice(1));
		WIND.eGroups[this.eGroupSelected].e.splice(num,1);
		this.fillEffectsData("g");
		FLAG.Scene.resize();
	}
}
//----------------------------------------------------------------------------------------------
//END REMOVE EFFECT



//REMOVE eGROUP
//removes an eGroup
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeeGroup = function(){
	
	var numeGroups = WIND.eGroups.length;

	this.createUndo();
	
	var eGroupsToKeep = [];
	for(var e=0;e<numeGroups;e++){
		if(e != this.eGroupSelected){
			eGroupsToKeep.push(WIND.eGroups[e]);
		}
	}	
	WIND.eGroups = eGroupsToKeep;
	eGroupsToKeep =[];
	
	
	//go through all of the events
	//adjust the eGroup numbers to reflect the removal
	//get rid of eGroup on the removed eGroup
	var numEvents = WIND.events.length;
	for(var e=0;e<numEvents;e++){
		
		var numEffects = WIND.events[e].effects.length;
		for(var efct=0;efct<numEffects;efct++){
			
			//one time effects
			var numOTeffects = WIND.events[e].effects[efct].ot.length;
			var otEfctsToKeep = [];
			for(var otEfct=0;otEfct<numOTeffects;otEfct++){
			
				//if the effect is not a eGroup, keep it
				if(WIND.events[e].effects[efct].ot[otEfct][0] != 'g'){
				
					otEfctsToKeep.push(WIND.events[e].effects[efct].ot[otEfct]);
					
				//if the effect is an eGroup
				}else{
				
					//if the eGroup is the one being removed
					if(WIND.events[e].effects[efct].ot[otEfct][1] == this.eGroupSelected){
						
						//this effect will  be removed
						
					//if the eGroup is higher than the one being removed
					}else if(WIND.events[e].effects[efct].ot[otEfct][1] > this.eGroupSelected){
					
						WIND.events[e].effects[efct].ot[otEfct][1] -= 1;
						otEfctsToKeep.push(WIND.events[e].effects[efct].ot[otEfct]);
					
					//if the eGroup is lower than the one being removed	
					}else if(WIND.events[e].effects[efct].ot[otEfct][1] < this.eGroupSelected){
					
						otEfctsToKeep.push(WIND.events[e].effects[efct].ot[otEfct]);
					}					
					
				}
				
			}
			WIND.events[e].effects[efct].ot = otEfctsToKeep;
			otEfctsToKeep = [];
			
			//recurring effects
			var numReffects = WIND.events[e].effects[efct].r.length;
			var rEfctsToKeep = [];
			for(var rEfct=0;rEfct<numReffects;rEfct++){
			
				//if the effect is not a eGroup, keep it
				if(WIND.events[e].effects[efct].r[rEfct][0] != 'g'){
				
					rEfctsToKeep.push(WIND.events[e].effects[efct].r[rEfct]);
					
				//if the effect is an eGroup
				}else{
					
					//if the eGroup is the one being removed
					if(WIND.events[e].effects[efct].r[rEfct][1] == this.eGroupSelected){
						
						//this effect will  be removed
						
					//if the eGroup is higher than the one being removed
					}else if(WIND.events[e].effects[efct].r[rEfct][1] > this.eGroupSelected){
					
						WIND.events[e].effects[efct].r[rEfct][1] -= 1;
						otEfctsToKeep.push(WIND.events[e].effects[efct].r[rEfct]);
						
					//if the eGroup is lower than the one being removed	
					}else if(WIND.events[e].effects[efct].r[rEfct][1] < this.eGroupSelected){
					
						otEfctsToKeep.push(WIND.events[e].effects[efct].r[rEfct]);
					}	
				
				}
			}
			WIND.events[e].effects[efct].r = rEfctsToKeep;
			rEfctsToKeep = [];
		
		}			
	}
	
	numeGroups = WIND.eGroups.length;
	
	if(this.eGroupSelected != 0){
		this.eGroupSelected -= 1;
	}
	
	if(numeGroups == 0){
		this.eGroupSelected = -1;
	}
	
	this.fill_eGroups();
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END REMOVE eGROUP



//REMOVE EVENT
//removes an event from the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeEvent = function(){
	var numEvents = WIND.events.length;

	this.createUndo();
	
	var eventsToKeep = [];
	for(var evt=0;evt<numEvents;evt++){
		if(evt != this.eventSelected){
			eventsToKeep.push(WIND.events[evt]);
		}
	}	
	WIND.events = eventsToKeep;
	eventsToKeep =[];
	
	//go through any prerequisites for the events
	//to remove any that match the event removed
	//and to adjust the indexes of those higher than the event removed
	numEvents = WIND.events.length;
	for(var evt=0;evt<numEvents;evt++){
		var prerequisitesToKeep = [];
		var prerequisiteMatchAmountsToKeep = [];
		var numPrerequisites = WIND.events[evt].prerequisites.length;
		for(var pre=0;pre<numPrerequisites;pre){
			//make sure the prerequisite event is not the one that has been removed
			if(WIND.events[evt].prerequisites[pre] != this.eventSelected){
				
				//check if the index is higher than the one removed
				if(WIND.events[evt].prerequisites[pre] > this.eventSelected){
					WIND.events[evt].prerequisites[pre] -= 1;
				}
				//keep it
				prerequisitesToKeep.push(WIND.events[evt].prerequisites[pre]);
				prerequisiteMatchAmountsToKeep.push(WIND.events[evt].prerequisiteMatchAmounts[pre]);
			}
		}
		WIND.events[evt].prerequisites = prerequisitesToKeep;
		prerequisitesToKeep = [];
		WIND.events[evt].prerequisiteMatchAmounts = prerequisiteMatchAmountsToKeep;
		prerequisiteMatchAmountsToKeep = [];
	}	
	
	if(this.eventSelected != 0){
		this.eventSelected -= 1;
	}
	
	if(numEvents == 0){
		this.eventSelected = -1;
	}
	
	this.fillEventsData();

	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";

}
//----------------------------------------------------------------------------------------------
//END REMOVE EVENT


//REMOVE EXPORT WIND LINK
//removes a export link display for some browsers
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeExportWINDLink = function(event)
{
	document.body.removeChild(event.target);
}
//----------------------------------------------------------------------------------------------
//END REMOVE EXPORT WIND LINK



//REMOVE METRIC
//removes a metric from the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeMetric = function(){
	
	if(this.metricSelected != -1){
	
		this.createUndo();
	
		var metricToKeep = [];
		var viewPlayerMetricsToKeep = [];
		var numMetrics = WIND.metrics.length;
		for(var i=0;i<numMetrics;i++){
			if(i != this.metricSelected){
				metricToKeep.push(WIND.metrics[i]);
				viewPlayerMetricsToKeep.push(this.PlayerMeticsView[i]);
			}
		}	
		
		WIND.metrics = metricToKeep;
		metricToKeep = [];
		
		this.PlayerMeticsView = viewPlayerMetricsToKeep;
		viewPlayerMetricsToKeep = [];
		
		//go through all of the events
		//adjust the metric numbers to reflect the removal
		//get rid of effects on the removed metric
		var numEvents = WIND.events.length;
		for(var e=0;e<numEvents;e++){
			
			var numEffects = WIND.events[e].effects.length;
			for(var efct=0;efct<numEffects;efct++){
				
				//one time effects
				var numOTeffects = WIND.events[e].effects[efct].ot.length;
				var otEfctsToKeep = [];
				for(var otEfct=0;otEfct<numOTeffects;otEfct++){
					
					//if the metric removed is being directly effected or is involved in the operation
					if(WIND.events[e].effects[efct].ot[otEfct][0] == this.metricSelected || (WIND.events[e].effects[efct].ot[otEfct][2] == 0 && WIND.events[e].effects[efct].ot[otEfct][3] == this.metricSelected)){
						
						//this effect will be removed
						
					}else{
					
						//if the metric directly effected is higher than the one removed, lower it by one
						if(WIND.events[e].effects[efct].ot[otEfct][0] > this.metricSelected){
							WIND.events[e].effects[efct].ot[otEfct][0] -= 1;
						}
						
						//if a metric involved in the operation is higher than the one removed, lower it by one
						if(WIND.events[e].effects[efct].ot[otEfct][2] == 0 && WIND.events[e].effects[efct].ot[otEfct][3] > this.metricSelected){
							WIND.events[e].effects[efct].ot[otEfct][3] -= 1;
						}
						
						otEfctsToKeep.push(WIND.events[e].effects[efct].ot[otEfct]);
					
					}
				}
				WIND.events[e].effects[efct].ot = otEfctsToKeep;
				otEfctsToKeep = [];
				
				//recurring effects
				var numReffects = WIND.events[e].effects[efct].r.length;
				var rEfctsToKeep = [];
				for(var rEfct=0;rEfct<numReffects;rEfct++){
					
					//if the metric removed is being directly effected or is involved in the operation
					if(WIND.events[e].effects[efct].r[rEfct][0] == this.metricSelected  || (WIND.events[e].effects[efct].r[rEfct][2] == 0 && WIND.events[e].effects[efct].r[rEfct][3] == this.metricSelected)){
						
						//this effect will be removed
						
					}else{
						
						//if the metric directly effected is higher than the one removed, lower it by one
						if(WIND.events[e].effects[efct].r[rEfct][0] > this.metricSelected){
							WIND.events[e].effects[efct].r[rEfct][0] -= 1;
						}
						
						//if a metric involved in the operation is higher than the one removed, lower it by one
						if(WIND.events[e].effects[efct].r[rEfct][2] == 0 && WIND.events[e].effects[efct].r[rEfct][3] > this.metricSelected){
							WIND.events[e].effects[efct].r[rEfct][3] -= 1;
						}
					
						rEfctsToKeep.push(WIND.events[e].effects[efct].r[rEfct]);
					
					}
				}
				WIND.events[e].effects[efct].r = rEfctsToKeep;
				rEfctsToKeep = [];
			
			}			
		}
		
		
		//go through all of the eGroups
		//adjust the metric numbers to reflect the removal
		//get rid of effects on the removed metric
		if(WIND.eGroups != undefined && WIND.eGroups.length > 0){
		
			var numeGroups = WIND.eGroups.length;
			for(var eg=0;eg<numeGroups;eg++){
				
				var numEffects = WIND.eGroups[eg].e.length;
				var effectsToKeep = [];
				for(var ef=0;ef<numEffects;ef++){
					
					//if the metric removed is being directly effected or is involved in the operation
					if(WIND.eGroups[eg].e[ef][0] == this.metricSelected  || (WIND.eGroups[eg].e[ef][2] == 0 && WIND.eGroups[eg].e[ef][3] == this.metricSelected)){
						
						//this effect will be removed
						
					}else{
					
						//if the metric directly effected is higher than the one removed, lower it by one
						if(WIND.eGroups[eg].e[ef][0] > this.metricSelected){
							WIND.eGroups[eg].e[ef][0] -= 1;
						}
						
						//if a metric involved in the operation is higher than the one removed, lower it by one
						if(WIND.eGroups[eg].e[ef][2] == 0 && WIND.eGroups[eg].e[ef][3] > this.metricSelected){
							WIND.eGroups[eg].e[ef][3] -= 1;
						}
						
						effectsToKeep.push(WIND.eGroups[eg].e[ef]);
					
					}
				}
				WIND.eGroups[eg].e = effectsToKeep;
				effectsToKeep = [];				
			}		
		}
		
	
		this.updateJSON();
		this.resetAllGUI();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END REMOVE METRIC



//REMOVE OVERALL EFFECT
//remove an entire effects option form an event in the WIND object
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removeOverallEffect = function(){
	var num = document.getElementById("effectsList").selectedIndex;
	var numEffects = WIND.events[this.eventSelected].effects.length;
	if(numEffects > 1){
		
		this.createUndo();
	
		var effectsToKeep = [];
		for(var e=0;e<numEffects;e++){
			if(e != num){
				effectsToKeep.push(WIND.events[this.eventSelected].effects[e]);
			}
		}
	
		WIND.events[this.eventSelected].effects = effectsToKeep;
		effectsToKeep = [];
		
		if(num > 0){
			this.effectSelected -= 1;
		}
		
		this.fillEventsData();
		
		this.updateJSON();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END REMOVE OVERALL EFFECT



//REMOVE PREREQUISITE
//remove a prerequisite from an event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.removePrerequisite = function(which){

	this.createUndo();

	var num = Number(which.id.slice(11));
	var numPrerequisites = WIND.events[this.eventSelected].prerequisites.length;
	var preToKeep = [];
	var prerequisiteMatchAmountsToKeep = [];
	for(var p=0;p<numPrerequisites;p++){
		if(num != p){
			preToKeep.push(Number(WIND.events[this.eventSelected].prerequisites[p]));
			prerequisiteMatchAmountsToKeep.push(WIND.events[this.eventSelected].prerequisiteMatchAmounts[p]);
		}
	}
	
	if(preToKeep.length == 0){
		WIND.events[this.eventSelected].prerequisites = undefined;
		WIND.events[this.eventSelected].prerequisiteMatchAmounts = undefined;
	}else{
		WIND.events[this.eventSelected].prerequisites = preToKeep;
		WIND.events[this.eventSelected].prerequisiteMatchAmounts = prerequisiteMatchAmountsToKeep;
	}
	preToKeep = [];
	prerequisiteMatchAmountsToKeep = [];
	
	this.fillEventsData();
	
	this.updateJSON();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";	
}
//----------------------------------------------------------------------------------------------
//END REMOVE PREREQUISITE



//REPLAY HISTORY
//uses the players history to replay every turn
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.replayHistory = function(){
	
	//make a copy of the Player's history
	var historyCopy = this.clone(WIND.Player.history);
	
	//clear everything
	this.resetSim();
	
	//wait half a second and reload the game from the history
	setTimeout(function(){
	
		WIND.rerunHistory(historyCopy);
		WE.updateDisplay_postEvent();
	
	},500);
}
//----------------------------------------------------------------------------------------------
//END REPLAY HISTORY



//RESET ALL GUI
//sets all HTML GUI to original states
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.resetAllGUI = function(){

	//metrics
	this.fillMetricsList();
	
	//events
	this.fillEventsData();
	
	//eGroup
	this.fill_eGroups();
	
	//sim
	this.resetSim();
	
	//hide menu bar menus
	this.menuBar_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END RESET ALL GUI



//RESET SIM
//resets the simulation, clears player history and resets player metrics
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.resetSim = function(){

	WIND.initPlayer();
	this.updateDisplay_postEvent();
	
}
//----------------------------------------------------------------------------------------------
//END RESET SIM



//RESTRICT CHARACTERS
//restricts the characters that can be typed into inputs
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.restrictCharacters = function(myfield, e, restriction){
	
	var restrictionType = [];
	switch(restriction){
		case "digits":
			restrictionType = /[1234567890]/g;
			break;
		case "integer":
			restrictionType = /[0-9\.]/g;
			break;
		case "posNegInteger":
			restrictionType = /[0-9\.-]/g;
			break;
		case "alpha":
			restrictionType = /[A-Za-z]/g;
			break;
	}
	
	var varName = /[A-Za-z1234567890\_]/g;
	
	if (!e) var e = window.event
	if (e.keyCode) code = e.keyCode;
	else if (e.which) code = e.which;
	var character = String.fromCharCode(code);

	// if they pressed esc... remove focus from field...
	if (code==27) { this.blur(); return false; }

	// ignore if they are press other keys
	// strange because code: 39 is the down key AND ' key...
	// and DEL also equals .
	if (!e.ctrlKey && code!=9 && code!=8 && code!=36 && code!=37 && code!=38 && (code!=39 || (code==39 && character=="'")) && code!=40) {
		if (character.match(restrictionType)) {
			if(restrictionType == varName){
				if(myfield.value.length == 0){
					if (character.match(digits)) {
						return false;
					}else{
						return true;
					}
				}
			}else{
				return true;
			}
		} else {
			return false;
		}
	}
}
//----------------------------------------------------------------------------------------------
//END RESTRICT CHARACTERS



//RUN EVENT
//mock setup to trigger WIND events
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.runEvent = function(){

	switch(WIND.events[this.simEvent].type){
	
		//happenstance
		case 0:
			
			//store any returned errors from the WIND runEvent function
			var result = WIND.runEvent({evt:this.simEvent,opt:0});
						
			//if the result returns no errors
			if(result.length == 0){
			
				//clear the display
				document.getElementById("simContent").innerHTML = '';	
				//update
				this.updateDisplay_postEvent();
				
			//if there was an error with the event
			}else{
				
				document.getElementById("simContent").innerHTML = '<h1>ERROR</h1><p class="simMainText">'+result[0]+'</p><button onclick="WE.clearEvtDisplay();">OK</button>';
			}
			break;
			
		//multiple choice
		case 1:
			var group = document.getElementsByName('multipleChoice');
			var option = null;
			for (var i=0;i<group.length;i++) {
				if (group[i].checked) {
					option = i;
				}
			}
			if(option != null){
				
				//store any returned errors from the WIND runEvent function
				var result = WIND.runEvent({evt:this.simEvent,opt:option});
				
				//if the result returns no errors
				if(result.length == 0){
				
					//clear the display
					document.getElementById("simContent").innerHTML = '';	
					//update
					this.updateDisplay_postEvent();
				
				//if there was an error with the event
				}else{
				
					document.getElementById("simContent").innerHTML = '<h1>ERROR</h1><p class="simMainText">'+result[0]+'</p><button onclick="WE.clearEvtDisplay();">OK</button>';
				}
					
			}else{
			
				alert("You must select an option.");
			}
			break;
		
		//multiple selection
		case 2:
			var group = document.getElementsByName('multipleSelection');
			var options = [];
			for (var i=0;i<group.length;i++) {
				if (group[i].checked) {
					options.push(i);
				}
			}
			if(options.length != 0){
				
				//store any returned errors from the WIND runEvent function
				var result = WIND.runEvent({evt:this.simEvent,opt:options});
				
				//if the result returns no errors
				if(result.length == 0){
				
					//clear the display
					document.getElementById("simContent").innerHTML = '';	
					//update
					this.updateDisplay_postEvent();
					
				//if there was an error with the event
				}else{
				
					document.getElementById("simContent").innerHTML = '<h1>ERROR</h1><p class="simMainText">'+result[0]+'</p><button onclick="WE.clearEvtDisplay();">OK</button>';
				}
			}else{
			
				alert("You must select at least one option.");
			}
			break;
		
			
		//slider
		case 3:
		
			var value = Number(document.getElementById("sliderValue").innerHTML);
			
			//store any returned errors from the WIND runEvent function
			var result = WIND.runEvent({evt:this.simEvent,opt:value});
			
			//if the result returns no errors
			if(result.length == 0){
			
				//clear the display
				document.getElementById("simContent").innerHTML = '';	
				//update
				this.updateDisplay_postEvent();
			
			//if there was an error with the event
			}else{
				
				document.getElementById("simContent").innerHTML = '<h1>ERROR</h1><p class="simMainText">'+result[0]+'</p><button onclick="WE.clearEvtDisplay();">OK</button>';
			}
			break;
			
	}
}
//----------------------------------------------------------------------------------------------
//END RUN EVENT



//SCENE LOADED
//periodically update the load progress bar
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.sceneLoaded = function(){
	
	WE.resetAllGUI();

	//SCENE METHODS
	//------------------------------------------------------------------------------------------
	FLAG.Scene.resize = function(){
	
		//MENUS
		document.getElementById("menus").style.left=(document.getElementById('canvas').clientWidth-300).toString()+"px";
		document.getElementById("menus").style.height=(document.getElementById('canvas').clientHeight-36).toString()+"px";
		
		//SUBMENUS
		var subMenuObjs = document.getElementsByClassName('subMenu');
		var numsubMenuObjs = subMenuObjs.length;
		for(var i=0; i<numsubMenuObjs; i++){
			if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
 			 	subMenuObjs[i].style['height'] = (document.getElementById('canvas').clientHeight-271).toString()+'px';
			}else{
				subMenuObjs[i].style['height'] = (document.getElementById('canvas').clientHeight-71).toString()+'px';
			}
		}
		
		//JSON
		document.getElementById("code_container").style.top=(document.getElementById('canvas').clientHeight-200).toString()+"px";
				
		//POPUP
		if(window.getComputedStyle(document.getElementById('popUp')).getPropertyValue('visibility') == "visible"){
			WE.centerPopUp();
		}
		
		//SIM OVERLAY
		//if the WIND code window is open
		if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
			//make the simOverlay the height of the canvas minus the height of the WIND menu minus the height of the top menu bar
			document.getElementById("simOverlay").style.height = (document.getElementById('canvas').clientHeight-200-36).toString()+"px";
		}else{
			//make the simOverlay the height of the canvas minus the height of the top menu bar
			document.getElementById("simOverlay").style.height = (document.getElementById('canvas').clientHeight-36).toString()+"px";
		}
		
		//if the menus are visible
		if(window.getComputedStyle(document.getElementById('menus')).getPropertyValue('visibility') == "visible"){
			//make the simOverlay the width of the canvas minus the width of the menus
			document.getElementById("simOverlay").style.width = (document.getElementById('canvas').clientWidth-300).toString()+"px";
		}else{
			//make the simOverlay the width of the canvas
			document.getElementById("simOverlay").style.width = (document.getElementById('canvas').clientWidth).toString()+"px";
		}

	}
	
	FLAG.Scene.resize();
	
	FLAG.Scene.keyDown = function(e){
		if (e.shiftKey && e.ctrlKey && e.keyCode == 50){
			WE.view('menus');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 51){
			WE.view('json');
		}
		//Import
		if (e.shiftKey && e.ctrlKey && e.keyCode == 73){
			WE.popUps('importJSON');
		}
		//Export
		if (e.shiftKey && e.ctrlKey && e.keyCode == 69){
			WE.popUps('exportJSON');
		}
		//Undo
		if (e.shiftKey && e.ctrlKey && e.keyCode == 90){
			WE.undo();
		}
	}
	//------------------------------------------------------------------------------------------
	
	FLAG.Scene.bgColor = "333";
	
	WE.reloadTimeOut = 0;
}
//----------------------------------------------------------------------------------------------
//END SCENE LOADED



//SHOW LOAD PROGRESS
//periodically update the load progress bar
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.showLoadProgress = function(){	

	//make bar grow showing load progress
	document.getElementById("loadProgress_wind").style.width = FLAG.sceneLoadProgress+"%";
	document.getElementById("loadProgressText").innerHTML = FLAG.sceneLoadProgress+"%";
	
	//if load is finished
	if(FLAG.sceneLoadProgress == 100){
		clearInterval(this.loadInterval);
		//wait half a second
		setTimeout(function(){
			//use FLAG.Tween to move the progress bar off the screen, and make invisible when done
			var progressBar = document.getElementById("progressBar");
			FLAG.Tween(progressBar,"top",0,.5,FLAG.easeInBack,function(){document.getElementById("progressBar").style.visibility = "hidden";});
		},500);
		//wait a second
		setTimeout(function(){
			//use FLAG.Tween to fade the whiteGlass
			FLAG.Tween(document.getElementById("whiteGlass"),"opacity",0,.5,FLAG.linear,function(){document.getElementById("whiteGlass").style.visibility = "hidden";});
		},1000);
	}
}
//----------------------------------------------------------------------------------------------
//END SHOW LOAD PROGRESS



//SHOW SLIDER VALUE
//updates the slider value display for mock slider events
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.showSliderValue = function(newValue){
	document.getElementById("sliderValue").innerHTML = newValue;
}
//----------------------------------------------------------------------------------------------
//END SHOW SLIDER VALUE



//UNDO
//removes the last copy of the WIND object and reloads a previous copy from the undo list
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.undo = function(){
	var numUndos = this.undos.length;
	if(numUndos > 0){
		WIND = this.clone(this.undos[numUndos-1]);
		
		//give WIND back all of it's functions
		//by making it a FLAGWIND object
		var tempWIND = new FLAGWIND();
		tempWIND.metrics = WIND.metrics;
		tempWIND.events = WIND.events;
		tempWIND.eGroups = WIND.eGroups;
		tempWIND.decimals = WIND.decimals;
		WIND = tempWIND;
		tempWIND = null;
		
		this.undos.splice(numUndos-1,1);
		this.resetAllGUI();
		this.updateJSON();
	}
	
	//hide menu bar menus
	this.menuBar_dropDowns("none");	
	
	//hide popups
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END UNDO



//UPDATE DISPLAY POST EVENT
//updates the all the GUI after running a WIND event
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.updateDisplay_postEvent = function(){

	var numMetrics = WIND.Player.metrics.length;
	var p = {}
	p.turn = WIND.Player.history.length;

	//check for EXTRAS on the metrics
	//this updates the value of any metrics with extras
	for(var m=0;m<numMetrics;m++){
	
		//EXTRAS
		//are there extras with WIND metric
		if(WIND.Player.metrics[m].extras != undefined){
		
			//if using an extra called byTurn, the length of the player's history is used as the counter through the extra array
			if(WIND.Player.metrics[m].extras.byTurn != undefined && WIND.Player.metrics[m].extras.byTurn.length > 0){
	
				var lengthOfByTurn = WIND.Player.metrics[m].extras.byTurn.length;
		
				//if there is not enough values in the byTurn
				if(lengthOfByTurn <= p.turn){
		
					//is a loop set
					if(WIND.Player.metrics[m].extras.loop != undefined && WIND.Player.metrics[m].extras.loop == true){
			
						//loop back around to get value
						var turnValue = p.turn % lengthOfByTurn;
						WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras.byTurn[turnValue]);
				
					//no loop has been declared	
					}else{
		
						//use the last value in the byTurn
						WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras.byTurn[lengthOfByTurn-1]);
			
					}
			
				//the extra array is long enough
				}else{
				
					//use the length of the history as the counter
					WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras.byTurn[p.turn]);
				}
		
		
			//if using another metric as the counter through the extra array
			}else{
			
				var mIndexes = [];
				//is there an extra property the same name as a metric
				for (var key in WIND.Player.metrics[m].extras) {
				
					//search the metrics, and store the indexes
					for(var em=0;em<numMetrics;em++){
						if(key == WIND.Player.metrics[em].name){
							mIndexes.push(em);
						}
					}
				}
						
						
				//for each extra that is a metric
				var numMetricExtras = mIndexes.length;
				for(var em=0;em<numMetricExtras;em++){
			
					//use the stored metric indexes to get the name of the metric
					var metricName = WIND.Player.metrics[mIndexes[em]].name;
			
					//get the length of the extra array
					var lea = WIND.Player.metrics[m].extras[metricName].length;
				
					//if there is not enough values in the extra array
					if(lea <= WIND.Player.metrics[mIndexes[em]].value){
					
						//is a loop set
						if(WIND.Player.metrics[m].extras.loop != undefined && WIND.Player.metrics[m].extras.loop == true){
					
							//loop back around to get value
							var turnValue = WIND.Player.metrics[mIndexes[em]].value % lea;
							WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras[metricName][turnValue]);
					
						//no loop has been declared	
						}else{
					
							//use the last value
							WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras[metricName][lea-1]);
			
						}
					
					//the extra array is long enough
					}else{
					
						//use the metric as a counter
						WIND.Player.metrics[m].value = Number(WIND.Player.metrics[m].extras[metricName][WIND.Player.metrics[mIndexes[em]].value]);
					}
				}
			}
		}
	}	


	
	this.updateJSON();
	

	//update display of Player's metrics
	html = '';
	for(var i=0;i<numMetrics;i++){
			
		html += '<div class="pmListItem"><div class="butName">'+WIND.Player.metrics[i].name+'</div><div class="butValue">'+WIND.Player.metrics[i].value+'</div>';
		html += '<div class="butView">';
		html += '<input type="checkbox" id="pm_'+i+'" name="pms" class="windInput" onclick="WE.changePMSview();"/>';
		html += '<label for="pm_'+i+'"><span></span></label>';
		html += '</div>';
		html += '</div>';
	}
	document.getElementById("playerMetricsList").innerHTML = html;
	
	var group = document.getElementsByName('pms');
	for (var i=0;i<group.length;i++) {
		//0 - means not showing, 1 - means showing
		if (this.PlayerMeticsView[i] == 1) {
			document.getElementById("pm_"+i).checked = true;
		}else{
			document.getElementById("pm_"+i).checked = false;
		}
	}
	
	
	//update display of Player's history
	html = '';
	var numTurns = WIND.Player.history.length;
	for(var i=0;i<numTurns;i++){	
		html += '<button type="button" class="button_unselected"><span class="butName">'+WIND.Player.history[i].evt+'</span><span class="butValue">'+WIND.Player.history[i].opt+'</span></button>';
	}
	document.getElementById("playerHistoryList").innerHTML = html;
	
	document.getElementById("numTurnsInHistory").innerHTML = WIND.Player.history.length;
	
	//update the simOverlay
	html = "";
	var numMetrics = WIND.metrics.length;
	for(var i=0;i<numMetrics;i++){
		if(this.PlayerMeticsView[i] == 1){
			html += '<div class="simMetric" id="simMetric_'+i+'">';
			html += '<span class="simMetric_name" id="'+WIND.Player.metrics[i].name+'">';
			html += WIND.Player.metrics[i].name;
			html += '</span>';
			html += '<span class="simMetric_value" id="'+WIND.Player.metrics[i].name+'_value">';
			html += WIND.Player.metrics[i].value;
			html += '</span>';
			html += '</div>';
		}
	}
	document.getElementById("simMetrics").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END UPDATE DISPLAY POST EVENT



//UPDATE EFFECTS
//updates the WIND object with effects changes in events and in eGroups
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.updateEffects = function(){
	
	//if editing effects in an eGroup
	if(document.getElementById("popUp").className == "addeGroup" || document.getElementById("popUp").className == "editeGroup"){
	
	
		WIND.eGroups[this.eGroupSelected].name = String(document.getElementById("eGroupName").value);
		
		var numEffects = WIND.eGroups[this.eGroupSelected].e.length;
		
		//loop through both the one time and recurring effects
		for(var i=0;i<numEffects;i++){
		
			//the metric being effected
			WIND.eGroups[this.eGroupSelected].e[i][0] = Number(document.getElementById("g_metric_" + i).selectedIndex);
	
			//the math sign
			var dropDown = document.getElementById("g_sign_" + i);
			WIND.eGroups[this.eGroupSelected].e[i][1] = String(dropDown.options[dropDown.selectedIndex].value);
	
			//type
			//0--metric, 1--number or 2--compound
			WIND.eGroups[this.eGroupSelected].e[i][2] = Number(document.getElementById("g_type_" + i).selectedIndex);
	
			//value
			//if the type is a metric
			if(WIND.eGroups[this.eGroupSelected].e[i][2] == 0){
	
				WIND.eGroups[this.eGroupSelected].e[i][3] = Number(document.getElementById("g_value_" + i).selectedIndex);
	
			//if the type is a number or compound	
			}else{
		
				WIND.eGroups[this.eGroupSelected].e[i][3] = Number(document.getElementById("g_value_" + i).value);
	
			}
		}

	
	//if editing effects in an event
	}else{
	
		//text
		WIND.events[this.eventSelected].effects[this.effectSelected].text = String(document.getElementById("effectText").value);
	
		//is the event a slider event?
		if(WIND.events[this.eventSelected].type == 3){
	
			WIND.events[this.eventSelected].effects[this.effectSelected].value = Number(document.getElementById("sliderValue").value);
		}
	
		//loop through both the one time and recurring effects
		for(var otr=0;otr<2;otr++){
	
			switch(otr){
				case 0:
					var whichEffects = "ot";
					var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].ot;
					var numEffects = WIND.events[this.eventSelected].effects[this.effectSelected].ot.length;
					break;
				case 1:
					var whichEffects = "r";
					var effectsArray = WIND.events[this.eventSelected].effects[this.effectSelected].r;
					var numEffects = WIND.events[this.eventSelected].effects[this.effectSelected].r.length;
					break;
			}
	
			for(var i=0;i<numEffects;i++){
			
				//is this a metric
				if(effectsArray[i][0] != "g"){
		
					//the metric being effected
					effectsArray[i][0] = Number(document.getElementById(whichEffects + "_metric_" + i).selectedIndex);
		
					//the math sign
					var dropDown = document.getElementById(whichEffects + "_sign_" + i);
					effectsArray[i][1] = String(dropDown.options[dropDown.selectedIndex].value);
		
					//type
					//0--metric, 1--number or 2--compound
					effectsArray[i][2] = Number(document.getElementById(whichEffects + "_type_" + i).selectedIndex);
		
					//value
					//if the type is a metric
					if(effectsArray[i][2] == 0){
		
						effectsArray[i][3] = Number(document.getElementById(whichEffects + "_value_" + i).selectedIndex);
		
					//if the type is a number or compound	
					}else{
			
						effectsArray[i][3] = Number(document.getElementById(whichEffects + "_value_" + i).value);
		
					}
				
				//is this an eGroup
				}else if(effectsArray[i][0] == "g"){
				
					effectsArray[i][1] = Number(document.getElementById(whichEffects + "_eGroup_" + i).selectedIndex);
				
				}
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END UPDATE EFFECTS



//UPDATE JSON
//keeps the WIND object displayed in the code window
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.updateJSON = function(){

	var tab = "&nbsp&nbsp&nbsp&nbsp";
	var html = '<pre class="yellow">WIND = {<br>';
	for (var key in WIND) {
		switch(key){
			case "Player":
				//save until end
				break;
			case "metrics":
				html += tab + key + ":[<br>";
				var numMetrics = WIND.metrics.length;
				for(var i=0;i<numMetrics;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + WIND.metrics[i].name + "',<br>";
					html += tab + tab + "value:" + WIND.metrics[i].value + ",<br>";
					if(WIND.metrics[i].neg != undefined){
						html += tab + tab + "neg:" + WIND.metrics[i].neg;
					}else{
						html += tab + tab + "neg:" + true;
					}
					 
					//are there extras
					if(WIND.metrics[i].extras != undefined){
						html += ",<br>";		
						
						//are the extras an object
						if(typeof WIND.metrics[i].extras == "object"){
						
							html += tab + tab + "extras:";
							
								var string = JSON.stringify(WIND.metrics[i].extras);
								html += string;
							
							html += tab + tab + "<br>";
						}else{
						
							//are the extras a number
							if(isNaN(WIND.metrics[i].extras) != true){
								
								html += tab + tab + "extras:" + WIND.metrics[i].extras + "<br>";
							
							//must be a string then
							}else{
							
								html += tab + tab + "extras:'" + WIND.metrics[i].extras + "'<br>";
							}
						}
					
					//no extras				
					}else{
						html += "<br>";
					}
					
					html += tab + tab + "}";
					if(i != numMetrics-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "events":
				html += tab + key + ":[<br>";
				var numEvents = WIND.events.length;
				for(var evt=0;evt<numEvents;evt++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + WIND.events[evt].name + "',<br>";
					html += tab + tab + "type:" + WIND.events[evt].type + ",<br>";
					html += tab + tab + "mText:'" + WIND.events[evt].mText + "',<br>";
					html += tab + tab + "effects:[<br>";
					var numEffects = WIND.events[evt].effects.length;
					for(var ef=0;ef<numEffects;ef++){
						html += tab + tab + tab + "{<br>";
						html += tab + tab + tab + "text:'" + WIND.events[evt].effects[ef].text + "',<br>";
						html += tab + tab + tab + "ot:[";
						
						//one time effects
						var numOTeffects = WIND.events[evt].effects[ef].ot.length;
						for(var ote=0;ote<numOTeffects;ote++){
						
							//is the effect on a metric
							if(WIND.events[evt].effects[ef].ot[ote][0] != "g"){
						
								html += "[" + WIND.events[evt].effects[ef].ot[ote][0] + ",'" + WIND.events[evt].effects[ef].ot[ote][1] + "'," + WIND.events[evt].effects[ef].ot[ote][2] + "," + WIND.events[evt].effects[ef].ot[ote][3] + "]";
							
							//is the effect an eGroup
							}else if(WIND.events[evt].effects[ef].ot[ote][0] == "g"){
							
								html += "['g'," + WIND.events[evt].effects[ef].ot[ote][1] + "]";
							
							}
							
							if(ote != numOTeffects-1){
								html += ",";
							}
						}
						html += "],<br>";
						
						
						html += tab + tab + tab + "r:[";
						
						//recurring effects
						var numReffects = WIND.events[evt].effects[ef].r.length;
						for(var re=0;re<numReffects;re++){
						
							//is the effect on a metric
							if(WIND.events[evt].effects[ef].r[re][0] != "g"){
													
								html += "[" + WIND.events[evt].effects[ef].r[re][0] + ",'" + WIND.events[evt].effects[ef].r[re][1] + "'," + WIND.events[evt].effects[ef].r[re][2] + "," + WIND.events[evt].effects[ef].r[re][3] + "]";
							
							//is the effect an eGroup
							}else if(WIND.events[evt].effects[ef].r[re][0] == "g"){
							
								html += "['g'," + WIND.events[evt].effects[ef].r[re][1] + "]";
							
							}
							
							if(re != numReffects-1){
								html += ",";
							}
						}
						html += "]";
						
						//is there a value, meaning this is a slider event
						if(WIND.events[evt].effects[ef].value != undefined){
							html += ",<br>";
							html += tab + tab + tab + "value:" + WIND.events[evt].effects[ef].value + "<br>";
						//no value
						}else{
							html += "<br>";
						}
					
						html += tab + tab + tab + "}";
						if(ef != numEffects-1){
							html += ",<br>";
						}else{
							html += "<br>";
						}
					}
					html += tab + tab + "]";
					
					if(WIND.events[evt].prerequisites != undefined){
						html += ",<br>";
						html += tab + tab + "prerequisites:["+WIND.events[evt].prerequisites+"],<br>";	
						html += tab + tab + "prerequisiteMatchAmounts:["+WIND.events[evt].prerequisiteMatchAmounts+"]";
					}
					
					if(WIND.events[evt].repeatLimit != undefined){
						html += ",<br>";
						html += tab + tab + "repeatLimit:" + WIND.events[evt].repeatLimit;
					}										
					
					html += "<br>";
					
					html += tab + tab + "}";
					if(evt != numEvents-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;				
				
			case "eGroups":
				
				if(WIND.eGroups != undefined){
				
					html += tab + key + ":[<br>";
					var numeGroups = WIND.eGroups.length;
					for(var eg=0;eg<numeGroups;eg++){
					
						//make a new group of effects
						html += tab + tab + "{name:'"+WIND.eGroups[eg].name+"',e:[";
					
						var numEffects = WIND.eGroups[eg].e.length;
						for(var ef=0;ef<numEffects;ef++){
						
							html += "["+WIND.eGroups[eg].e[ef][0]+",'"+WIND.eGroups[eg].e[ef][1]+"',"+WIND.eGroups[eg].e[ef][2]+","+WIND.eGroups[eg].e[ef][3]+"]";
						
							//close the new group of effects
							if(ef != numEffects-1){
								html += ",";
							}
						}
				
						if(eg != numeGroups-1){
							html += "]},<br>";
						}else{
							html += "]}<br>";
						}
					}
					html += tab + "],<br>";
				}
				break;	
				
			case "decimals":
				
				if(WIND.decimals != undefined){	
					html += tab + key + ":" + WIND.decimals + ",<br>";
				}else{
					html += tab + "decimals:" + WIND.decimals + ",<br>";
				}
				break;
		}
	}
	
	html += tab + "Player:{<br>";
	html += tab + tab + "metrics:[<br>";
	var numMetrics = WIND.Player.metrics.length;
	for(var i=0;i<numMetrics;i++){
		html += tab + tab + tab + "{<br>";
		html += tab + tab + tab + "name:'" + WIND.Player.metrics[i].name + "',<br>";
		html += tab + tab +  tab +"value:" + WIND.Player.metrics[i].value;
	
		//are there extras
		if(WIND.Player.metrics[i].extras != undefined){
			html += ",<br>";		
		
			//are the extras an object
			if(typeof WIND.Player.metrics[i].extras == "object"){
		
				html += tab + tab + tab + "extras:";
			
					var string = JSON.stringify(WIND.Player.metrics[i].extras);
					html += string;
			
				html += tab + tab + tab + "<br>";
			}else{
		
				//are the extras a number
				if(isNaN(WIND.Player.metrics[i].extras) != true){
				
					html += tab + tab + tab + "extras:" + WIND.Player.metrics[i].extras + "<br>";
			
				//must be a string then
				}else{
			
					html += tab + tab + tab + "extras:'" + WIND.Player.metrics[i].extras + "'<br>";
				}
			}
	
		//no extras				
		}else{
			html += "<br>";
		}
	
		html += tab + tab + tab + "}";
		if(i != numMetrics-1){
			html += ",<br>";
		}else{
			html += "<br>";
		}
	}				
	html += tab + tab + "],<br>";
	
	html += tab + tab + "history:[<br>";
	var numTurns = WIND.Player.history.length;
	for(var i=0;i<numTurns;i++){
		html += tab + tab + tab + "{<br>";
		html += tab + tab + tab + "evt:" + WIND.Player.history[i].evt + ",<br>";
		if (WIND.Player.history[i].opt instanceof Array) {
			html += tab + tab +  tab +"opt:[";
			var numEffects = WIND.Player.history[i].opt.length;
			for(var o=0;o<numEffects;o++){
				html += WIND.Player.history[i].opt[o];
				if(o != numEffects-1){
					html += ",";
				}
			}
			html += "]<br>";
		}else{
			html += tab + tab +  tab +"opt:" + WIND.Player.history[i].opt + "<br>";
		}
		html += tab + tab + tab + "}";
		if(i != numTurns-1){
			html += ",<br>";
		}else{
			html += "<br>";
		}
	}					
	html += tab + tab + "]<br>";
	
	html += tab + "}<br>";
	
	html += '};</pre>';
	document.getElementById("JSON").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END UPDATE JSON



//VIEW
//Controls for the view menu
//----------------------------------------------------------------------------------------------
WINDEDITOR.prototype.view = function(which){
	switch(which){
		case "menus":
			if(window.getComputedStyle(document.getElementById('menus')).getPropertyValue('visibility') == "visible"){
				document.getElementById("menus").style.visibility = "hidden";
				document.getElementById('metrics').style.overflowY = "hidden";
				document.getElementById('events').style.overflowY = "hidden";
				document.getElementById('simulator').style.overflowY = "hidden";
				document.getElementById("dDmenus").innerHTML = "Show Menus<span class=\'keyCommand_wind\'>&#8679 CTRL 2</span>";
			}else{
				document.getElementById("menus").style.visibility = "visible";
				if(window.getComputedStyle(document.getElementById('metrics')).getPropertyValue('visibility') == "visible"){
					document.getElementById('metrics').style.overflowY = "auto";
				}
				if(window.getComputedStyle(document.getElementById('events')).getPropertyValue('visibility') == "visible"){
					document.getElementById('events').style.overflowY = "auto";
				}
				if(window.getComputedStyle(document.getElementById('simulator')).getPropertyValue('visibility') == "visible"){
					document.getElementById('simulator').style.overflowY = "auto";
				}
				document.getElementById("dDmenus").innerHTML = "Hide Menus<span class=\'keyCommand_wind\'>&#8679 CTRL 2</span>";
			}
			FLAG.scaleGame();
			break;
		case "json":
			var subMenuObjs = document.getElementsByClassName('subMenu');
			var numsubMenuObjs = subMenuObjs.length;
			if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
				document.getElementById("code_container").style.visibility = "hidden";
				document.getElementById("json").innerHTML = "Show WIND<span class=\'keyCommand_wind\'>&#8679 CTRL 3</span>";
				for(var i=0; i<numsubMenuObjs; i++){
					subMenuObjs[i].style['height'] = (FLAG.h-71).toString()+'px';
				}
			}else{
				updateJSON();
				document.getElementById("code_container").style.visibility = "visible";
				document.getElementById("json").innerHTML = "Hide WIND<span class=\'keyCommand_wind\'>&#8679 CTRL 3</span>";
				for(var i=0; i<numsubMenuObjs; i++){
					subMenuObjs[i].style['height'] = (FLAG.h-271).toString()+'px';
				}
			}
			FLAG.scaleGame();
			break;
	}
	
	//hide menu bar menus
	menuBar_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END VIEW



//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END WINDEDITOR CONSTRUCTOR