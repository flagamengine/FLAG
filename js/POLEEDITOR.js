/*
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
FLAG Game Engine - POLEEDITOR.js
Author: Zac Zidik
URL: www.flagamengine.com/POLE
version 1.0.1
updated 3/5/2015

This is the editor code for the POLE object used by FLAG.
Use the editor to create all the assets and scenes for your game.
The POLE Editor is a running instance of the FLAG Game Engine.
Anything done here, can be done with your game at runtime.

Thanks for trying out the POLE Editor and good luck!
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
*/

//POLE EDITOR (PE)
//the instance of the POLE editor
//----------------------------------------------------------------------------------------------
var PE = {};


//START
//called immediately after the FLAG Engine is initialized
//----------------------------------------------------------------------------------------------
function start(){

	FLAG.Grid.on = true;
	
	//create the instance of the POLE editor
	PE = new POLEEDITOR();
									
	PE.menus_init();
	FLAG.loadScene(PE.sceneSelected,PE.scene_loaded);
	
	//put the progressBar in the center of the screen
	document.getElementById("progressBar").style.left = ((FLAG.Canvas.width/2) - 100).toString() + "px";
	document.getElementById("progressBar").style.top = ((FLAG.Canvas.height/2) - 150).toString() + "px";
	document.getElementById("progressBar").style.visibility = "visible";
	document.getElementById("loadProgressText").innerHTML = "0%";
	
	//periodically call the scene_loadProgress function
	PE.loadInterval = setInterval(function(){PE.scene_loadProgress();},250);
	
}
//----------------------------------------------------------------------------------------------
//END START


//POLE EDITOR CONSTRUCTOR
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
var POLEEDITOR = function(){
	
	//PROPERTIES
	//keep track of the state of GUI menu items
	//-------------------------------------------
	this.activeLayer = 0;
	this.actorInSceneSelected = -1;
	this.actorSelected = -1;
	this.animationPreview = null;
	this.animationPreviewState = "play";
	this.animationSelected = -1;
	this.bodies = [];
	this.bodySelected = 0;
	this.controlPoint = {active:false,loc:{x:0,y:0},radius:5,polyLoc:[],polyIndex:null};
	this.isDrawing = false;
	this.jointSelected = -1;
	this.joints = [];
	this.library = [
		{name:"None",url:""},
		{name:"Time and Patients",url:"http://www.flagamengine.com/POLE/library/timeandpatients.js"},
		{name:"Wave One - Tile Pathing",url:"http://www.flagamengine.com/POLE/library/waveOneTilePathing.js"},
		{name:"Wave Two - Building Blocks",url:"http://www.flagamengine.com/POLE/library/waveTwoBuildingBlocks.js"},
		{name:"Wave Three - Platformer",url:"http://www.flagamengine.com/POLE/library/waveThreePlatformer.js"}
	];
	this.loadInterval = null;
	this.mapLoc = {x:0,y:0};
	this.mapLock = "middle";
	this.numPoints = 4;
	this.okToDrawTiledObject = true;
	this.okToEraseTiledObject = false;
	this.popUpSize = {w:400,h:300};
	this.reloadTimeOut = 0;
	this.scale = 1;
	this.sceneSelected = 0;
	this.screenShot = null;
	this.selected = {type:null,index:null,dragging:false,pAdjust:{x:0,y:0}};
	this.spriteSheetSelected = -1;
	this.tempAudio = null;
	this.tileAnimationSelected = -1;
	this.tileSelected = {tileNum:-1,sheetNum:-1};
	this.tileSheetGridColor = "blue";
	this.tileSheetScale = 1;
	this.tileSize = 1;
	this.tiledObjectSheetAnimationSelected = -1;
	this.tiledObjectSheetSelected = -1;
	this.toolSelected = "none";
	this.undos = [];
	this.zoom = 1;
}


//METHODS

//ASSETS
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//ASSETS ACTORS
//----------------------------------------------------------------------------------------------

//ASSETS ACTORS ADD
//Add an actor to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_add = function(){

	var numBodies = this.bodies.length;
	var allPolyBodiesAreValid = true;
	for(var b=0;b<numBodies;b++){
		//check if all poly shapes are valid
		if(this.bodies[b].shape == "poly"){
			//make sure this is a valid poly 
			if(Box2DSeparator.validate(this.bodies[b].shapeDefinition) != 0){
				allPolyBodiesAreValid = false;
			}
		}
	}
	
	if(allPolyBodiesAreValid == true){
		if(document.getElementById("actorName").value != ""){
			this.assets_actors_body_update();
		
			var numBodies = this.bodies.length;
			var bodies = [];
			for(var b=0;b<numBodies;b++){
				bodies.push(this.bodies[b]);
			}
		
			var numJoints = this.joints.length;
			var joints = [];
			for(var j=0;j<numJoints;j++){
				joints.push(this.joints[j]);
			}
		
			this.undo_create();
						
			POLE.actors.push({
				name:document.getElementById("actorName").value,
				bodies:bodies,
				joints:joints,
				});
			
			
			this.animationPreviewState = "stop";
			clearInterval(PE.animationPreview);
			
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		
			this.bodies = [];
			this.bodySelected = -1;
		}
	}else{
		alert("One or more of the Bodies has a shape that is an invalid polygon. Make sure the points are in clockwise order.");
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS ADD



//ASSETS ACTORS BODY ADD
//Adds a body to the actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_add = function(){
	this.assets_actors_body_update();
	
	html = '<h2>Body Name:</h2><br>';
	html += '<input type="text" id="bodyName" value="Body_' + PE.bodies.length + '" style="width:350px;" onblur="PE.assets_actors_body_update();PE.assets_actors_body_name();" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
	html += '<hr style="width:350px;">';

	html += '<div id="positionAndParent" style="display:block;float:left;width:350px;margin-bottom:10px;">';
	html += '<div style="display:block;float:left;width:165px;margin-bottom:10px;">';
	html += '<h2>Position:</h2><br>';
	html += '<span >x:</span><input type="text" id="positionX" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()">';
	html += '<span > y:</span><input type="text" id="positionY" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()">';
	html += '</div>';
	
	html += '<div id="parentBodyContainer" style="display:block;float:left;width:165px;margin-bottom:10px;margin-left:20px;">';
	html += '</div>';
	html += '<hr style="width:350px;">';
	html += '</div>';
			
	html += '<div style="display:block;float:left;width:90px;margin-right:10px;margin-bottom:10px;">';
	html += '<h2>Shape:</h2><br>';
	html += '<select id="shapeType" style="width:90px;" onchange="PE.assets_actors_body_changeShape()">';
	html += '<option>Box</option>';
	html += '<option>Circle</option>';
	html += '<option>Polygon</option>';
	html += '<option>Tile</option>';
	html += '</select>';
	html += '<h2>Type:</h2><br>';
	html += '<select id="bodyType" style="width:90px;" onchange="">';
	html += '<option>Dynamic</option>';
	html += '<option>Static</option>';
	html += '<option>Kinematic</option>';
	html += '</select>';
	html += '</div>';
			
	html += '<div id="shapeDefinitionContainer" style="display:block;float:left;width:240px;margin-right:10px;margin-bottom:20px;">';
	html += '<h2>Shape Definition:</h2><br>';
	html += '<div style="display:block;float:left;width:240px;height:50px;overflow-y:auto;overflow-x:hidden;border:1px inset;padding:5px;" id="shapeDefinition">';
	html += '<span >w:</span><input type="text" id="box_w" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
	html += '<span > h:</span><input type="text" id="box_h" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
	html += '</div>';
	html += '</div>';
	
	html += '<hr style="width:350px;">';
	
	html += '<div>';
	html += '<input type="checkBox" id="fixedRotation" onclick="PE.assets_actors_body_update();"/>';
	html += '<label for="fixedRotation"><span></span>Fixed Rotation</label>';
	html += '</div>';
			
	html += '<hr style="width:350px;">';
			
	html += '<h2>Fixture Definiton:</h2>';
	html += '<div style="display:block;float:left;width:350px;margin-bottom:10px;">';
	html += '<table>';
	html += '<tr>';
	html += '<td><h2>Density:</h2></td><td><input type="text" id="density" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
	html += '</tr>';
	html += '<tr>';
	html += '<td><h2>Friction:</h2></td><td><input type="text" id="friction" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
	html += '</tr>';
	html += '<tr>';
	html += '<td><h2>Restitution:</h2></td><td><input type="text" id="restitution" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
	html += '</tr>';
	html += '<tr>';
	html += '<td><h2>Filter Group:</h2></td><td><input type="text" id="filterGroup" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
	html += '</tr>';
	html += '</table>';
	html += '</div>';
	html += '<hr style="width:350px;">';			
			
	html += '<div style="display:block;float:left;width:350px;">';
	html += '<h2>Sprite Sheet:</h2><br><select id="spriteSheetSelect" style="width:350px;" onchange="PE.assets_actors_body_changeSprite()">';
	html += '<option>None</option>';
	var numSpriteSheets = POLE.spriteSheets.length;
	for(var i=0;i<numSpriteSheets;i++){
		html += '<option>'+POLE.spriteSheets[i].name+'</option>';
	}
	html += '</select>';
	html += '</div>';
			
	html += '<div style="display:block;float:left;width:350px;margin-top:10px;">';
	html += '<h2>Animation:</h2><br><select id="animationSelect" style="width:350px;" onchange="PE.assets_actors_body_changeAnimation()">';
	html += '<option>None</option>';
	html += '</select>';
	html += '</div>';
			
	html += '<div style="display:block;float:left;width:350px;margin-top:10px;margin-bottom:10px;">';
	html += '<h2>Frame Number:</h2><br><select id="frameNumberSelect" style="width:100px;" onchange="">';
	html += '<option>None</option>';
	html += '</select>';
	html += '</div>';
	html += '<hr style="width:350px;">';
			
	document.getElementById("bodiesContainer").innerHTML = html;
	
	this.bodies.push({name:"Body_" + PE.bodies.length,position:{x:0,y:0},parentBody:0,shape:"box",shapeDefinition:{w:64,h:64},type:"dynamic",fixedRotation:false,fixDef:{density:1,friction:1,restitution:0,filter:{groupIndex:0}},spriteSheet:null,animation:null,frame:null});
	
	this.assets_actors_body_fillList();
	
	document.getElementById("bodySelect").selectedIndex = this.bodies.length-1;
	this.bodySelected = this.bodies.length-1;
	
	if(this.bodySelected != 0){
		html = '';
		html += '<h2>Parent Body:</h2><br>';
		html += '<select id="parentBody" style="width:165px;" onchange="PE.assets_actors_body_changeParent()">';
		var numBodies = this.bodySelected;
		for(var b=0;b<numBodies;b++){
			html += '<option>'+PE.bodies[b].name+'</option>';
		}
		html += '</select>';	
		document.getElementById("parentBodyContainer").innerHTML = html;
		document.getElementById("parentBody").selectedIndex = this.bodies[this.bodySelected].parentBody;
		
	}else{
		document.getElementById("parentBodyContainer").innerHTML = "";
		this.bodies[this.bodySelected].parentBody = 0;
	}
	
	this.assets_actors_preview();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY ADD



//ASSETS ACTORS BODY ADD POINT
//When the shape of the actor's body is a polygon, this adds a point to that shape
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_addPoint = function(){
	//make a new point in between the last and first and last point
	var midPoint = {x:0,y:0};
	midPoint.x = Math.floor((this.bodies[this.bodySelected].shapeDefinition[0].x + this.bodies[this.bodySelected].shapeDefinition[this.numPoints-1].x)/2);
	midPoint.y = Math.floor((this.bodies[this.bodySelected].shapeDefinition[0].y + this.bodies[this.bodySelected].shapeDefinition[this.numPoints-1].y)/2);
	
	//add the new point
	this.bodies[this.bodySelected].shapeDefinition.push(midPoint);
	this.numPoints += 1;
	
	var html = '';
	for(var p=0;p<this.numPoints;p++){
		if(p == this.numPoints-1){
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<div style="display:block;float:right;">';
			html += '<button onclick="PE.assets_actors_body_addPoint()" style="margin-left:5px;">Add</button>';
			html += '<button onclick="PE.assets_actors_body_removePoint()">Remove</button>';
			html += '<div>';
		}else{
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
		}
	}
	document.getElementById("shapeDefinition").innerHTML = html;
	
	this.assets_actors_preview();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY ADD POINT



//ASSETS ACTORS BODY CHANGE ANIMATION
//Change the animation of a sprite of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_changeAnimation = function(){
	if(document.getElementById("animationSelect").selectedIndex <= 0){
		//add all frames from spriteSheet
		var numFrames = Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.w) * Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.h);
		var html = '';
		for(var i=0;i<numFrames;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("frameNumberSelect").innerHTML = html;
		this.bodies[this.bodySelected].animation  = null; 
		this.bodies[this.bodySelected].frame = 0;
	}else{
		//add only frames of selected animation
		var startFrame = Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].animations[document.getElementById("animationSelect").selectedIndex-1].startFrame);
		var endFrame = Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].animations[document.getElementById("animationSelect").selectedIndex-1].endFrame);
		var html = '';
		for(var i=startFrame;i<endFrame+1;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("frameNumberSelect").innerHTML = html;
		this.bodies[this.bodySelected].animation  = Number(document.getElementById("animationSelect").selectedIndex)-1; 
		this.bodies[this.bodySelected].frame = startFrame; 
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY CHANGE ANIMATION



//ASSETS ACTORS BODY CHANGE PARENT
//Assigns the parent body of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_changeParent = function(){
	this.assets_actors_body_update();
	this.bodies[this.bodySelected].parentBody = Number(document.getElementById("parentBody").selectedIndex);
	this.assets_actors_body_update_gui();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY CHANGE PARENT



//ASSETS ACTORS BODY CHANGE SHAPE
//Controls the portion of the popUp menu for editing an actor's body shape
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_changeShape = function(){
	switch(document.getElementById("shapeType").selectedIndex){
		case 0:
			html = "";
			html += '<h2>Shape Definition:</h2><br>';
			html += '<div id="shapeDefinition"></div>';
			document.getElementById("shapeDefinitionContainer").innerHTML = html;
		
			if(this.bodies[this.bodySelected].shape == "box"){
				html = '<span >w:</span><input type="text" id="box_w" value="' + PE.bodies[PE.bodySelected].shapeDefinition.w + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				html += '<span > h:</span><input type="text" id="box_h" value="' + PE.bodies[PE.bodySelected].shapeDefinition.h + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
			}else{
				html = '<span >w:</span><input type="text" id="box_w" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				html += '<span > h:</span><input type="text" id="box_h" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				
				this.bodies[this.bodySelected].shape = "box";
				this.bodies[this.bodySelected].shapeDefinition = {w:64,h:64};
			}
			document.getElementById("shapeDefinition").innerHTML = html;
						
			this.assets_actors_preview();
			break;
		case 1:
			html = "";
			html += '<h2>Shape Definition:</h2><br>';
			html += '<div id="shapeDefinition"></div>';
			document.getElementById("shapeDefinitionContainer").innerHTML = html;
			
			if(this.bodies[this.bodySelected].shape == "circle"){
				html = '<span >radius:</span><input type="text" id="radius" value="' + PE.bodies[PE.bodySelected].shapeDefinition.radius + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
			}else{
				html = '<span >radius:</span><input type="text" id="radius" value="32" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				
				this.bodies[this.bodySelected].shape = "circle";
				this.bodies[this.bodySelected].shapeDefinition = {radius:32};
			}
			document.getElementById("shapeDefinition").innerHTML = html;
			
			this.assets_actors_preview();
			break;
		case 2:
			html = "";
			html += '<h2>Shape Definition:</h2><br>';
			html += '<div id="shapeDefinition"></div>';
			document.getElementById("shapeDefinitionContainer").innerHTML = html;
	
			if(this.bodies[this.bodySelected].shape == "poly"){
				this.numPoints = this.bodies[this.bodySelected].shapeDefinition.length;
			}else{
				this.bodies[this.bodySelected].shape = "poly";
				this.numPoints = 4;
				this.bodies[this.bodySelected].shapeDefinition = [];
				this.bodies[this.bodySelected].shapeDefinition.push({x:-32,y:-32});
				this.bodies[this.bodySelected].shapeDefinition.push({x:32,y:-32});
				this.bodies[this.bodySelected].shapeDefinition.push({x:32,y:32});
				this.bodies[this.bodySelected].shapeDefinition.push({x:-32,y:32});
			}
			
			var html = '';
			for(var p=0;p<this.numPoints;p++){
				if(p == this.numPoints-1){
					html += '<div id="point_'+p+'">';
					html += '<span >x:</span>';
					html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
					html += '<span > y:</span>';
					html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
					html += '<div style="display:block;float:right;">';
					html += '<button onclick="PE.assets_actors_body_addPoint()" style="margin-left:5px;">Add</button>';
					if(this.numPoints > 3){
						html += '<button onclick="PE.assets_actors_body_removePoint()">Remove</button>';
					}
					html += '</div>';
				}else{
					html += '<div id="point_'+p+'">';
					html += '<span >x:</span>';
					html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
					html += '<span > y:</span>';
					html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
				}
					html += '</div>';
			}
			document.getElementById("shapeDefinition").innerHTML = html;
			
			this.assets_actors_preview();
			break;	
		case 3:
			html = "";
			html += '<h2>Shape Definition:</h2><br>';
			html += '<div id="shapeDefinition"></div>';
			document.getElementById("shapeDefinitionContainer").innerHTML = html;
		
			if(this.bodies[this.bodySelected].shape == "tile"){
				html = '<span >w:</span><input type="text" id="box_w" value="' + PE.bodies[PE.bodySelected].shapeDefinition.w + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				html += '<span > h:</span><input type="text" id="box_h" value="' + PE.bodies[PE.bodySelected].shapeDefinition.h + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
			}else{
				this.bodies[this.bodySelected].shape = "tile";
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.bodies[this.bodySelected].shapeDefinition = {w:64,h:64};
					html = '<span >w:</span><input type="text" id="box_w" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
					html += '<span > h:</span><input type="text" id="box_h" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.bodies[this.bodySelected].shapeDefinition = {w:64,h:32};
					html = '<span >w:</span><input type="text" id="box_w" value="64" style="width:40px;" onblur="PE.assets_actors_body_update()">';
					html += '<span > h:</span><input type="text" id="box_h" value="32" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				}
			}
			document.getElementById("shapeDefinition").innerHTML = html;
			
			this.assets_actors_preview();
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY CHANGE SHAPE



//ASSETS ACTORS BODY CHANGE SPRITE
//Change the sprite of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_changeSprite = function(){
	if(document.getElementById("spriteSheetSelect").selectedIndex <= 0){
		this.bodies[this.bodySelected].spriteSheet = null;
		var html = '<option>None</option>';
		document.getElementById("animationSelect").innerHTML = html;
		var html = '<option>None</option>';
		document.getElementById("frameNumberSelect").innerHTML = html;
	}else{
		this.bodies[this.bodySelected].spriteSheet = document.getElementById("spriteSheetSelect").selectedIndex-1;
		//add animations of spriteSheet
		var numAnimations = POLE.spriteSheets[this.bodies[this.bodySelected].spriteSheet].animations.length;
		var html = '<option>None</option>';
		for(var i=0;i<numAnimations;i++){
			html += '<option>'+POLE.spriteSheets[PE.bodies[PE.bodySelected].spriteSheet].animations[i].name+'</option>';
		}
		document.getElementById("animationSelect").innerHTML = html;
		this.bodies[this.bodySelected].animation = null;
		
		//add all frames from spriteSheet
		var numFrames = Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.w) * Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.h);
		var html = '';
		for(var i=0;i<numFrames;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("frameNumberSelect").innerHTML = html;
		this.bodies[this.bodySelected].frame = 0;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY CHANGE SPRITE



//ASSETS ACTORS BODY FILL LIST
//Fills the list of the actor's bodies
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_fillList = function(){
	var html = '';
	var numBodies = this.bodies.length;
	for(var i=0;i<numBodies;i++){
		html += '<option>'+PE.bodies[i].name+'</option>';
	}
	document.getElementById("bodySelect").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY FILL LIST



//ASSETS ACTORS BODY NAME
//Edit the name of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_name = function(){
	this.assets_actors_body_fillList();
	document.getElementById("bodySelect").selectedIndex = this.bodySelected;
	if(this.bodySelected != 0){
		this.assets_actors_body_parent_fillList();
		document.getElementById("parentBody").selectedIndex = this.bodies[this.bodySelected].parentBody;
	}
	if(this.joints.length > 0){
		this.assets_actors_joint_bodies_fillList();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY NAME



//ASSETS ACTORS BODY PARENT FILL LIST
//Fills the list with possible parent bodies
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_parent_fillList = function(){
	html = '';
	//var numBodies = this.bodies.length-1;
	var numBodies = this.bodySelected;
	for(var b=0;b<numBodies;b++){
		html += '<option>'+PE.bodies[b].name+'</option>';
	}
	document.getElementById("parentBody").innerHTML = html;	
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY PARENT FILL LIST



//ASSETS ACTORS BODY REMOVE
//Removes a body from the actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_remove = function(){
	if(this.bodies.length > 1){
		this.bodies.splice(this.bodySelected,1);
		this.assets_actors_body_fillList();
		
		if(this.bodies.length == 1){
			this.jointSelected = -1;
			this.joints = [];
			this.assets_actors_joint_fillList();
			this.assets_actors_joint_update_gui();
		}else{
			var numJoints = this.joints.length;
			var jointsToKeep = [];
			//remove any joints that might have contained the removed body
			for(var j=0;j<numJoints;j++){
				if(this.joints[j].body1 == this.bodySelected || this.joints[j].body2 == this.bodySelected){
					//do not add
				}else{
					jointsToKeep.push(this.joints[j]);
				}
			}
			this.joints = jointsToKeep;
			jointsToKeep = [];
			//change any body numbers that may have bee above the removed body
			numJoints = this.joints.length;
			for(var j=0;j<numJoints;j++){
				if(this.joints[j].body1 > this.bodySelected){
					this.joints[j].body1 -= 1;
				}
				if(this.joints[j].body2 > this.bodySelected){
					this.joints[j].body2 -= 1;
				}
			}
			if(this.joints.length > 0){
				this.jointSelected = 0;
			}else{
				this.jointSelected = -1;
			}
			this.assets_actors_joint_fillList();
			this.assets_actors_joint_update_gui();

			//change any parentBodies that might have the deleted body to 0
			var numBodies = this.bodies.length;
			for(var b=0;b<numBodies;b++){
				if(this.bodies[b].parentBody == this.bodySelected){
					this.bodies[b].parentBody = 0;
				}
			}
		}
		
		if(this.bodySelected > 0){
			this.bodySelected -= 1;
		}else{
			this.bodySelected = 0;
		}
		document.getElementById("bodySelect").selectedIndex = this.bodySelected;
		this.assets_actors_body_update_gui();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY REMOVE



//ASSETS ACTORS BODY REMOVE POINT
//When the shape of the actor's body is a polygon, this removes a point from that shape
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_removePoint = function(){
	this.bodies[this.bodySelected].shapeDefinition.pop();
	this.numPoints -= 1;
	
	var html = '';
	for(var p=0;p<this.numPoints;p++){
		if(p == this.numPoints-1){
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<div style="display:block;float:right;">';
			html += '<button onclick="PE.assets_actors_body_addPoint()" style="margin-left:5px;">Add</button>';
			if(this.numPoints > 3){
				html += '<button onclick="PE.assets_actors_body_removePoint()">Remove</button>';
			}
			html += '<div>';
		}else{
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].x+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+PE.bodies[PE.bodySelected].shapeDefinition[p].y+'" style="width:35px;" onblur="PE.assets_actors_body_update()">';
		}
	}
	document.getElementById("shapeDefinition").innerHTML = html;
	
	this.assets_actors_preview();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY REMOVE POINT



//ASSETS ACTORS BODY SELECT
//Selects one of the actor's bodies
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_select = function(){
	this.assets_actors_body_update();
	this.bodySelected = document.getElementById("bodySelect").selectedIndex;
	this.assets_actors_body_update_gui();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY SELECT



//ASSETS ACTORS BODY UPDATE
//Updates all the info of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_update = function(){
	var centerDif = {x:0,y:0};
	this.bodies[this.bodySelected].name = document.getElementById("bodyName").value;
	if(this.bodySelected != 0){
		centerDif.x = Number(document.getElementById("positionX").value) - Number(this.bodies[this.bodySelected].position.x);
		centerDif.y = Number(document.getElementById("positionY").value) - Number(this.bodies[this.bodySelected].position.y);
		this.bodies[this.bodySelected].position.x = Number(document.getElementById("positionX").value);
		this.bodies[this.bodySelected].position.y = Number(document.getElementById("positionY").value);
		this.bodies[this.bodySelected].parentBody = document.getElementById("parentBody").selectedIndex;
	}else{
		this.bodies[this.bodySelected].position.x = 0;
		this.bodies[this.bodySelected].position.y = 0;
		this.bodies[this.bodySelected].parentBody = 0;
	}
	switch(document.getElementById("shapeType").selectedIndex){
		case 0:
			this.bodies[this.bodySelected].shape = "box";
			break;
		case 1:
			this.bodies[this.bodySelected].shape = "circle";
			break;
		case 2:
			this.bodies[this.bodySelected].shape = "poly";
			break;	
		case 3:
			this.bodies[this.bodySelected].shape = "tile";
			break;	
	}
	switch(this.bodies[this.bodySelected].shape){
		case "box":
			this.bodies[this.bodySelected].shapeDefinition = {w:Number(document.getElementById("box_w").value),h:Number(document.getElementById("box_h").value)};
			break;
		case "circle":
			this.bodies[this.bodySelected].shapeDefinition = {radius:Number(document.getElementById("radius").value)};
			break;
		case "poly":
			var points = [];
			for(var p=0;p<this.numPoints;p++){
				var x = Number(document.getElementById("point_"+p+"_x").value);
				var y = Number(document.getElementById("point_"+p+"_y").value);
				points.push({x:x,y:y});
			}
			this.bodies[this.bodySelected].shapeDefinition = points;
			break;
		case "tile":
			this.bodies[this.bodySelected].shapeDefinition = {w:Number(document.getElementById("box_w").value),h:Number(document.getElementById("box_h").value)};
			break;

	}
	switch(document.getElementById("bodyType").selectedIndex){
		case 0:
			this.bodies[this.bodySelected].type = "dynamic";
			break;
		case 1:
			this.bodies[this.bodySelected].type = "static";
			break;
		case 2:
			this.bodies[this.bodySelected].type = "kinematic";
			break;	
	}
	 
	this.bodies[this.bodySelected].fixedRotation = document.getElementById("fixedRotation").checked;
	this.bodies[this.bodySelected].fixDef = {density:Number(document.getElementById("density").value),friction:Number(document.getElementById("friction").value),restitution:Number(document.getElementById("restitution").value),filter:{groupIndex:Number(document.getElementById("filterGroup").value)}};
	
	if(document.getElementById("spriteSheetSelect").selectedIndex <= 0){
		this.bodies[this.bodySelected].spriteSheet = null;
	}else{
		this.bodies[this.bodySelected].spriteSheet = Number(document.getElementById("spriteSheetSelect").selectedIndex) - 1;
	}
	
	if(document.getElementById("animationSelect").selectedIndex <= 0){
		this.bodies[this.bodySelected].animation = null;
	}else{
		this.bodies[this.bodySelected].animation = Number(document.getElementById("animationSelect").selectedIndex) - 1;
	}
		
	if(document.getElementById("frameNumberSelect").options[document.getElementById("frameNumberSelect").selectedIndex].value == "None"){
		this.bodies[this.bodySelected].frame = null;
	}else{
		this.bodies[this.bodySelected].frame = Number(document.getElementById("frameNumberSelect").options[document.getElementById("frameNumberSelect").selectedIndex].value);
	}
	
	this.assets_actors_preview();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY UPDATE



//ASSETS ACTORS BODY UPDATE GUI
//Updates all GUI elements with the info of an actor's body
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_body_update_gui = function(){
	document.getElementById("bodyName").value = this.bodies[this.bodySelected].name;
	if(this.bodySelected != 0){
		var html = '<div style="display:block;float:left;width:165px;margin-bottom:10px;">';
		html += '<h2>Position:</h2><br>';
		html += '<span >x:</span><input type="text" id="positionX" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()">';
		html += '<span > y:</span><input type="text" id="positionY" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()">';
		html += '</div>';
		html += '<div id="parentBodyContainer" style="display:block;float:left;width:165px;margin-bottom:10px;margin-left:20px;">';
		html += '</div>';
		html += '<hr style="width:350px;">';
		document.getElementById("positionAndParent").innerHTML = html;
		document.getElementById("positionX").value = Number(this.bodies[this.bodySelected].position.x);
		document.getElementById("positionY").value = Number(this.bodies[this.bodySelected].position.y);
		html = '';
		html += '<h2>Parent Body:</h2><br>';
		html += '<select id="parentBody" style="width:165px;" onchange="PE.assets_actors_body_changeParent()">';
		var numBodies = this.bodySelected;
		for(var b=0;b<numBodies;b++){
			html += '<option>'+PE.bodies[b].name+'</option>';
		}
		html += '</select>';	
		document.getElementById("parentBodyContainer").innerHTML = html;
		document.getElementById("parentBody").selectedIndex = this.bodies[this.bodySelected].parentBody;
		
	}else{
		document.getElementById("positionAndParent").innerHTML = "";
		this.bodies[this.bodySelected].parentBody = 0;
	}
	
	switch(this.bodies[this.bodySelected].shape){
		case "box":
			document.getElementById("shapeType").selectedIndex = 0;
			break;
		case "circle":
			document.getElementById("shapeType").selectedIndex = 1;
			break;
		case "poly":
			document.getElementById("shapeType").selectedIndex = 2;
			break;	
		case "tile":
			document.getElementById("shapeType").selectedIndex = 3;
			break;	
	}
	
	this.assets_actors_body_changeShape();
	
	switch(this.bodies[this.bodySelected].shape){
		case "box":
			document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
			document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
			break;
		case "circle":
			document.getElementById("radius").value = this.bodies[this.bodySelected].shapeDefinition.radius;
			break;
		case "poly":
			this.numPoints = this.bodies[this.bodySelected].shapeDefinition.length;
			for(var p=0;p<this.numPoints;p++){
				document.getElementById("point_"+p+"_x").value = this.bodies[this.bodySelected].shapeDefinition[p].x;
				document.getElementById("point_"+p+"_y").value = this.bodies[this.bodySelected].shapeDefinition[p].y;
			}
			break;
		case "tile":
			document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
			document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
			break;
	}
	switch(this.bodies[this.bodySelected].type){
		case "dynamic":
			document.getElementById("bodyType").selectedIndex = 0;
			break;
		case "static":
			document.getElementById("bodyType").selectedIndex = 1;
			break;
		case "kinematic":
			document.getElementById("bodyType").selectedIndex = 2;
			break;	
	}
	 
	document.getElementById("fixedRotation").checked = this.bodies[this.bodySelected].fixedRotation;
	
	document.getElementById("density").value = this.bodies[this.bodySelected].fixDef.density;
	document.getElementById("friction").value = this.bodies[this.bodySelected].fixDef.friction;
	document.getElementById("restitution").value = this.bodies[this.bodySelected].fixDef.restitution;
	document.getElementById("filterGroup").value = this.bodies[this.bodySelected].fixDef.filter.groupIndex;
	
	if(this.bodies[this.bodySelected].spriteSheet == null){
		document.getElementById("spriteSheetSelect").selectedIndex = 0;
	}else{
		document.getElementById("spriteSheetSelect").selectedIndex = this.bodies[this.bodySelected].spriteSheet + 1;
		
		//add animations of spriteSheet
		var numAnimations = POLE.spriteSheets[this.bodies[this.bodySelected].spriteSheet].animations.length;
		var html = '<option>None</option>';
		for(var i=0;i<numAnimations;i++){
			html += '<option>'+POLE.spriteSheets[this.bodies[this.bodySelected].spriteSheet].animations[i].name+'</option>';
		}
		document.getElementById("animationSelect").innerHTML = html;
	
		//add all frames from spriteSheet
		var numFrames = Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.w) * Number(POLE.spriteSheets[document.getElementById("spriteSheetSelect").selectedIndex-1].numTiles.h);
		var html = '';
		for(var i=0;i<numFrames;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("frameNumberSelect").innerHTML = html;
	}	
	
	if(this.bodies[this.bodySelected].animation == null){
		document.getElementById("animationSelect").selectedIndex = 0;
	}else{
		document.getElementById("animationSelect").selectedIndex = this.bodies[this.bodySelected].animation + 1;
		this.assets_actors_body_changeAnimation();
	}
		
	if(this.bodies[this.bodySelected].frame == null){
		document.getElementById("frameNumberSelect").selectedIndex = 0;
	}else{
		var numOptions = document.getElementById("frameNumberSelect").options.length;
		for(var i=0;i<numOptions;i++){
			if(this.bodies[this.bodySelected].frame == Number(document.getElementById("frameNumberSelect").options[i].value)){
				document.getElementById("frameNumberSelect").selectedIndex = i;
			}
		}
	}
	
	this.assets_actors_body_fillList();
	document.getElementById("bodySelect").selectedIndex = this.bodySelected;
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS BODY UPDATE GUI



//ASSETS ACTORS COPY
//Make a copy of an actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_copy = function(){
	if(this.actorSelected != -1){
		
		var bodies = [];
		var numBodies = POLE.actors[this.actorSelected].bodies.length;
		for(var b=0;b<numBodies;b++){
			var newBody = {};
			newBody.name = POLE.actors[this.actorSelected].bodies[b].name;
			newBody.position = {};
            newBody.position.x = POLE.actors[this.actorSelected].bodies[b].position.x;
			newBody.position.y = POLE.actors[this.actorSelected].bodies[b].position.y;
            newBody.parentBody = POLE.actors[this.actorSelected].bodies[b].parentBody;
            newBody.shape = POLE.actors[this.actorSelected].bodies[b].shape;
            newBody.shapeDefinition = {};
            switch(POLE.actors[this.actorSelected].bodies[b].shape){
            	case "box":
            		newBody.shapeDefinition.w = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.w;
            		newBody.shapeDefinition.h = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.h;
            		break;
            	case "circle":
            		newBody.shapeDefinition.radius = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.radius;
            		break;
            	case "poly":
            		var numPoints = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.length;
            		newBody.shapeDefinition = [];
            		for(var p=0;p<numPoints;p++){
            			newBody.shapeDefinition.push({x:POLE.actors[this.actorSelected].bodies[b].shapeDefinition[p].x,y:POLE.actors[this.actorSelected].bodies[b].shapeDefinition[p].y});
            		}            	
            		break;
            	case "tile":
            		newBody.shapeDefinition.w = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.w;
            		newBody.shapeDefinition.h = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.h;
            		break;
            }
            newBody.type = POLE.actors[this.actorSelected].bodies[b].type;
            newBody.fixedRotation = POLE.actors[this.actorSelected].bodies[b].fixedRotation;
            newBody.fixDef = {};
            newBody.fixDef.density = POLE.actors[this.actorSelected].bodies[b].fixDef.density;
            newBody.fixDef.friction = POLE.actors[this.actorSelected].bodies[b].fixDef.friction;
            newBody.fixDef.restitution = POLE.actors[this.actorSelected].bodies[b].fixDef.restitution;
            newBody.fixDef.filter = {groupIndex:0};
            newBody.fixDef.filter.groupIndex = POLE.actors[this.actorSelected].bodies[b].fixDef.filter.groupIndex;
            newBody.spriteSheet = POLE.actors[this.actorSelected].bodies[b].spriteSheet;
            newBody.animation = POLE.actors[this.actorSelected].bodies[b].animation;
            newBody.frame = POLE.actors[this.actorSelected].bodies[b].frame;
			bodies.push(newBody);
		}
		var joints = [];
		var numJoints = POLE.actors[this.actorSelected].joints.length;
		for(var j=0;j<numJoints;j++){
			var newJoint = {};
			newJoint.name = POLE.actors[this.actorSelected].joints[j].name;
            newJoint.type = POLE.actors[this.actorSelected].joints[j].type;
            newJoint.body1 = POLE.actors[this.actorSelected].joints[j].body1;
            newJoint.body2 = POLE.actors[this.actorSelected].joints[j].body2;
            newJoint.collideConnected = POLE.actors[this.actorSelected].joints[j].collideConnected;
            
            switch(POLE.actors[this.actorSelected].joints[j].type){
				case "distance":
					newJoint.frequencyHz = POLE.actors[this.actorSelected].joints[j].frequencyHz;
					newJoint.dampingRatio = POLE.actors[this.actorSelected].joints[j].dampingRatio;
					break;
				case "revolve":
					newJoint.motorSpeed = POLE.actors[this.actorSelected].joints[j].motorSpeed;
					newJoint.maxMotorTorque = POLE.actors[this.actorSelected].joints[j].maxMotorTorque;
					newJoint.enableMotor = POLE.actors[this.actorSelected].joints[j].enableMotor;
					newJoint.lowerAngle = POLE.actors[this.actorSelected].joints[j].lowerAngle;
					newJoint.upperAngle = POLE.actors[this.actorSelected].joints[j].upperAngle;
					newJoint.enableLimit = POLE.actors[this.actorSelected].joints[j].enableLimit;
					newJoint.anchor = POLE.actors[this.actorSelected].joints[j].anchor;
					break;	
			}
            
			joints.push(newJoint);
		}
		
		this.undo_create();
		
		POLE.actors.push({
			name:POLE.actors[this.actorSelected].name+"_copy",
			bodies:bodies,
			joints:joints
		});
		
		this.actorSelected += 1;
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS COPY



//ASSETS ACTORS EDIT
//Edit an actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_edit = function(){
	
	var numBodies = this.bodies.length;
	var allPolyBodiesAreValid = true;
	for(var b=0;b<numBodies;b++){
		//check if all poly shapes are valid
		if(this.bodies[b].shape == "poly"){
			//make sure this is a valid poly 
			if(Box2DSeparator.validate(this.bodies[b].shapeDefinition) != 0){
				allPolyBodiesAreValid = false;
			}
		}
	}
	
	
	if(allPolyBodiesAreValid == true){
		if(document.getElementById("actorName").value != ""){
			this.assets_actors_body_update();
		
			var numBodies = this.bodies.length;
			var bodies = [];
			for(var b=0;b<numBodies;b++){
				bodies.push(this.bodies[b]);
			}
		
			var numJoints = this.joints.length;
			var joints = [];
			for(var j=0;j<numJoints;j++){
				joints.push(this.joints[j]);
			}
		
			this.undo_create();
		
			POLE.actors[this.actorSelected].name = document.getElementById("actorName").value;
			POLE.actors[this.actorSelected].bodies = bodies;
			POLE.actors[this.actorSelected].joints = joints;
			this.actorSelected = -1;
		
			this.animationPreviewState = "stop";
			clearInterval(PE.animationPreview);
			
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		
			this.bodies = [];
			this.bodySelected = -1;
		}
	}else{
		alert("One or more of the Bodies has a shape that is an invalid polygon. Make sure the points are in clockwise order.");
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS EDIT



//ASSETS ACTORS EDIT CANCEL
//Cancel the edit of an actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_edit_cancel = function(){
	this.animationPreviewState = "stop";
	clearInterval(PE.animationPreview);
		
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
	
	this.bodies = [];
	this.bodySelected = -1;
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS EDIT CANCEL



//ASSETS ACTORS JOINT ADD
//Adds a joint to an actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_add = function(){
	if(this.bodies.length > 1){
		this.joints.push({name:"Joint_"+this.joints.length,type:"distance",body1:0,body2:1,collideConnected:false,frequencyHz:0,dampingRatio:0});
		this.jointSelected = this.joints.length -1;
		this.assets_actors_joint_fillList();
		this.assets_actors_joint_update_gui();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT ADD



//ASSETS ACTORS JOINT BODIES FILL LIST
//Fills the lists with possible bodies to use with the joint
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_bodies_fillList = function(){
	var html ='';
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		html += '<option>'+PE.bodies[b].name+'</option>';
	}
	document.getElementById("jointBody1").innerHTML = html;
	document.getElementById("jointBody2").innerHTML = html;
	document.getElementById("jointBody1").selectedIndex = this.joints[this.jointSelected].body1;
	document.getElementById("jointBody2").selectedIndex = this.joints[this.jointSelected].body2;
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT BODIES FILL LIST



//ASSETS ACTORS JOINT FILL LIST
//Fills the list with the actor's joints
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_fillList = function(){
	var html = '';
	var numJoints = this.joints.length;
	for(var i=0;i<numJoints;i++){
		html += '<option>'+PE.joints[i].name+'</option>';
	}
	document.getElementById("jointSelect").innerHTML = html;
	if(numJoints > 0){
		document.getElementById("jointSelect").selectedIndex = this.jointSelected;
	}else{
		this.jointSelected = -1;
		document.getElementById("jointSelect").selectedIndex = -1;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT FILL LIST



//ASSETS ACTORS JOINT REMOVE
//Remove a joint from an actor
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_remove = function(){
	if(this.joints.length > 0){
		this.joints.splice(this.jointSelected,1);
		this.assets_actors_joint_fillList();
		
		if(this.jointSelected > 0){
			this.jointSelected -= 1;
		}else{
			if(this.joints.length == 0){
				this.jointSelected = -1;
				document.getElementById("jointsContainer").innerHTML = "";
			}else{
				this.jointSelected = 0;
			}
		}
		
		document.getElementById("jointSelect").selectedIndex = this.jointSelected;
		this.assets_actors_joint_update_gui();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT REMOVE



//ASSETS ACTORS JOINT SELECT
//Select a joint form the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_select = function(){
	this.joints[this.jointSelected] = {};
	this.joints[this.jointSelected].name = document.getElementById("jointName").value;
	switch(document.getElementById("jointType").selectedIndex){
		case 0:
			this.joints[this.jointSelected].type = "distance";
			this.joints[this.jointSelected].frequencyHz = 0;
			this.joints[this.jointSelected].dampingRatio = 0;
			break;
		case 1:
			this.joints[this.jointSelected].type = "revolve";
			this.joints[this.jointSelected].motorSpeed = 0;
			this.joints[this.jointSelected].maxMotorTorque = 64;
			this.joints[this.jointSelected].enableMotor = true;
			this.joints[this.jointSelected].lowerAngle = 0;
			this.joints[this.jointSelected].upperAngle = 0;
			this.joints[this.jointSelected].enableLimit = false;
			this.joints[this.jointSelected].anchor = 2;
			break;	
	}
	this.joints[this.jointSelected].body1 = document.getElementById("jointBody1").selectedIndex;
	this.joints[this.jointSelected].body2 = document.getElementById("jointBody2").selectedIndex;
	if(document.getElementById("collideConnected").checked == true){
		this.joints[this.jointSelected].collideConnected = true;
	}else{
		this.joints[this.jointSelected].collideConnected = false;
	}
	
	this.jointSelected = document.getElementById("jointSelect").selectedIndex;
	
	this.assets_actors_joint_update_gui();
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT SELECT



//ASSETS ACTORS JOINT UPDATE
//Update all the info of a joint
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_update = function(){
	this.joints[this.jointSelected] = {};
	this.joints[this.jointSelected].name = document.getElementById("jointName").value;
	switch(document.getElementById("jointType").selectedIndex){
		case 0:
			this.joints[this.jointSelected].type = "distance";
			this.joints[this.jointSelected].frequencyHz = Number(document.getElementById("frequencyHz").value);
			this.joints[this.jointSelected].dampingRatio = Number(document.getElementById("dampingRatio").value);
			break;
		case 1:
			this.joints[this.jointSelected].type = "revolve";
			this.joints[this.jointSelected].motorSpeed = Number(document.getElementById("motorSpeed").value);
			this.joints[this.jointSelected].maxMotorTorque = Number(document.getElementById("maxMotorTorque").value);
			if(document.getElementById("enableMotor").checked == true){
				this.joints[this.jointSelected].enableMotor = true;
			}else{
				this.joints[this.jointSelected].enableMotor = false;
			}
			this.joints[this.jointSelected].lowerAngle = Number(document.getElementById("lowerAngle").value);
			this.joints[this.jointSelected].upperAngle = Number(document.getElementById("upperAngle").value);
			if(document.getElementById("enableLimit").checked == true){
				this.joints[this.jointSelected].enableLimit = true;
			}else{
				this.joints[this.jointSelected].enableLimit = false;
			}
			if(document.getElementById("body1anchor").checked == true){
				this.joints[this.jointSelected].anchor = 1;
			}else if(document.getElementById("body2anchor").checked == true){
				this.joints[this.jointSelected].anchor = 2;
			}
			break;	
	}
	this.joints[this.jointSelected].body1 = document.getElementById("jointBody1").selectedIndex;
	this.joints[this.jointSelected].body2 = document.getElementById("jointBody2").selectedIndex;
	if(document.getElementById("collideConnected").checked == true){
		this.joints[this.jointSelected].collideConnected = true;
	}else{
		this.joints[this.jointSelected].collideConnected = false;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT UPDATE



//ASSETS ACTORS JOINT UPDATE GUI
//Update all the joint gui with the joint information
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_joint_update_gui = function(){
	if(this.joints.length > 0){
		if(this.joints.length > 0){
			var html ='';
			html += '<h2>Joint Name:</h2><br>';
			html += '<input type="text" id="jointName" value="Joint_0" style="width:350px;" onblur="PE.assets_actors_joint_update();PE.assets_actors_joint_fillList();" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
			html += '<hr style="width:350px;">';
			
			html += '<div style="display:block;float:left;width:350px;">';
			html += '<h2>Type:</h2><br><select id="jointType" style="width:350px;" onchange="PE.assets_actors_joint_select()">';
			html += '<option>Distance</option>';
			html += '<option>Revolve</option>';
			html += '</select>';
			
			html += '<div style="display:block;float:left;width:165px;margin-top:10px">';
			html += '<h2>Body 1:</h2><br><select id="jointBody1" style="width:165px;" onchange="PE.assets_actors_joint_update()">';
			var numBodies = this.bodies.length;
			for(var b=0;b<numBodies;b++){
				html += '<option>'+PE.bodies[b].name+'</option>';
			}
			html += '</select>';
			html += '</div>';
			
			html += '<div style="display:block;float:left;width:165px;margin-left:20px;margin-top:10px;margin-bottom:5px">';
			html += '<h2>Body 2:</h2><br><select id="jointBody2" style="width:165px;" onchange="PE.assets_actors_joint_update()">';
			for(var b=0;b<numBodies;b++){
				html += '<option>'+PE.bodies[b].name+'</option>';
			}
			html += '</select>';
			html += '</div>';	
			switch(this.joints[this.jointSelected].type){
				case "distance":
					html += '<hr style="width:350px;">';
					
					html += '<div>';
					html += '<input type="checkBox" id="collideConnected" onclick="PE.assets_actors_joint_update();"/>';
					html += '<label for="collideConnected"><span></span>Collide Connected</label>';
					html += '</div>';
					
					html += '<hr style="width:350px;">';
					html += '<table><tr>';
					html += '<td><h2>Frequency Hz:</h2></td>';
					html += '<td><input type="text" id="frequencyHz" value="0" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '<td><h2>Damping Ratio:</h2></td>';
					html += '<td><input type="text" id="dampingRatio" value="0" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '</tr></table>';
					break;
				case "revolve":
					html += '<table><tr>';
					html += '<td style="width:180px;">';
					
					html += '<div>';
					html += '<input type="radio" name="anchor" value="body1anchor" id="body1anchor" onclick="PE.assets_actors_joint_update();"/>';
					html += '<label for="body1anchor"><span></span>Anchor</label>';
					html += '</div>';
					
					html += '</td><td>';
					
					html += '<div>';
					html += '<input type="radio" name="anchor" value="body2anchor" id="body2anchor" checked="true" onclick="PE.assets_actors_joint_update();"/>';
					html += '<label for="body2anchor"><span></span>Anchor</label>';
					html += '</div>';
					
					html += '</td></tr></table>';
					html += '<hr style="width:350px;">';
					
					html += '<div>';
					html += '<input type="checkBox" id="collideConnected" onclick="PE.assets_actors_joint_update();"/>';
					html += '<label for="collideConnected"><span></span>Collide Connected</label>';
					html += '</div>';
					
					html += '<hr style="width:350px;">';
					html +=	'<div style="display:block;float:left;width:350px;"><input onclick="PE.assets_actors_joint_update();" type="checkBox" id="enableMotor" checked><h2 style="width:125px;">Enable Motor</h2></div>';
					html += '<div style="display:block;float:left;width:350px;"><table><tr>';
					html += '<td><h2>Motor Speed:</h2></td>';
					html += '<td><input type="text" id="motorSpeed" value="0" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '<td><h2>Max Motor Torque:</h2></td>';
					html += '<td><input type="text" id="maxMotorTorque" value="64" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '</tr></table>';
					html += '<hr style="width:350px;"></div>';
					html +=	'<div style="display:block;float:left;width:350px;"><input onclick="PE.assets_actors_joint_update();" type="checkBox" id="enableLimit"><h2 style="width:125px;">Enable Limit</h2></div>';
					html += '<div style="display:block;float:left;width:350px;"><table><tr>';
					html += '<td><h2>Lower Angle:</h2></td>';
					html += '<td><input type="text" id="lowerAngle" value="0" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '<td><h2>Upper Angle:</h2></td>';
					html += '<td><input type="text" id="upperAngle" value="0" style="width:50px;" onblur="PE.assets_actors_joint_update();" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></td>';
					html += '</tr></table></div>';
					break;	
			}
		}
		document.getElementById("jointsContainer").innerHTML = html;
		
		document.getElementById("jointName").value = this.joints[this.jointSelected].name;
		switch(this.joints[this.jointSelected].type){
			case "distance":
				document.getElementById("jointType").selectedIndex = 0;
				document.getElementById("frequencyHz").value = this.joints[this.jointSelected].frequencyHz;
				document.getElementById("dampingRatio").value = this.joints[this.jointSelected].dampingRatio;
				break;
			case "revolve":
				document.getElementById("jointType").selectedIndex = 1;
				if(this.joints[this.jointSelected].anchor == 1){
					document.getElementById("body1anchor").checked = true;
				}else if(this.joints[this.jointSelected].anchor == 2){
					document.getElementById("body2anchor").checked = true;
				}
				if(this.joints[this.jointSelected].enableMotor == true){
					document.getElementById("enableMotor").checked = true;
				}else{
					document.getElementById("enableMotor").checked = false;
				}
				document.getElementById("motorSpeed").value = this.joints[this.jointSelected].motorSpeed;
				document.getElementById("maxMotorTorque").value = this.joints[this.jointSelected].maxMotorTorque;
				if(this.joints[this.jointSelected].enableLimit == true){
					document.getElementById("enableLimit").checked = true;
				}else{
					document.getElementById("enableLimit").checked = false;
				}
				document.getElementById("lowerAngle").value = this.joints[this.jointSelected].lowerAngle;
				document.getElementById("upperAngle").value = this.joints[this.jointSelected].upperAngle;
				break;	
		}
		document.getElementById("jointBody1").selectedIndex = this.joints[this.jointSelected].body1;
		document.getElementById("jointBody2").selectedIndex = this.joints[this.jointSelected].body2;
		if(this.joints[this.jointSelected].collideConnected == true){
			document.getElementById("collideConnected").checked = true;
		}else{
			document.getElementById("collideConnected").checked = false;
		}
	}else{
		document.getElementById("jointsContainer").innerHTML = "";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS JOINT UPDATE GUI



//ASSETS ACTORS PREVIEW
//Draws an actor preview in the actor popUp menus
//Includes sprites and bodies
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_preview = function(){
	if(this.animationPreview != null){
		clearInterval(PE.animationPreview);
	}
	
	//create the canvas
	var sizeOfCanvas = {w:1000,h:1000};
	document.getElementById("actorPreview").innerHTML = '<canvas id="actorPreviewImage" width='+sizeOfCanvas.w+'px height='+sizeOfCanvas.h+'px ></canvas>';	
	var c=document.getElementById("actorPreviewImage");
	var ctx=c.getContext("2d");
	
	//scroll the canvas so that the body selected is in the center of the window
	var windowSize = {w:380,h:580};
	//body position
	var bodyPos = {x:0,y:0};
	if(this.bodySelected != 0){
		bodyPos.x = this.bodies[this.bodySelected].position.x + this.bodies[this.bodies[this.bodySelected].parentBody].position.x;
		bodyPos.y = this.bodies[this.bodySelected].position.y + this.bodies[this.bodies[this.bodySelected].parentBody].position.y;
	}
	document.getElementById("actorPreview").scrollLeft = ((sizeOfCanvas.w - windowSize.w)/2) + bodyPos.x;
	document.getElementById("actorPreview").scrollTop = ((sizeOfCanvas.h - windowSize.h)/2) + bodyPos.y;
		
	switch(this.bodies[this.bodySelected].shape){
		case "box":	
			//box control point
			this.controlPoint.loc.x = bodyPos.x + (this.bodies[this.bodySelected].shapeDefinition.w/2);
			this.controlPoint.loc.y = bodyPos.y - (this.bodies[this.bodySelected].shapeDefinition.h/2);
			break;
		case "circle":	
			//circle control point
			this.controlPoint.loc.x = bodyPos.x + (this.bodies[this.bodySelected].shapeDefinition.radius);
			this.controlPoint.loc.y = bodyPos.y;
			break;
		case "poly":
			this.controlPoint.polyLoc = [];
			//poly control points
			for(var p=0;p<this.numPoints;p++){
				this.controlPoint.polyLoc.push({x:Number(this.bodies[this.bodySelected].shapeDefinition[p].x),y:Number(this.bodies[this.bodySelected].shapeDefinition[p].y)});
			}
			break;
		case "tile":
			switch(FLAG.Scene.Map.type){
				case "orthogonal":
					//box control point
					this.controlPoint.loc.x = bodyPos.x + (this.bodies[this.bodySelected].shapeDefinition.w/2);
					this.controlPoint.loc.y = bodyPos.y - (this.bodies[this.bodySelected].shapeDefinition.h/2);
					break;
				case "isometric":
					//isometric control box
					this.controlPoint.loc.x = bodyPos.x;
					this.controlPoint.loc.y = bodyPos.y - (this.bodies[this.bodySelected].shapeDefinition.h/2);
					break;
				case "hexagonal":
					//hexagonal control box
					this.controlPoint.loc.x = bodyPos.x + (this.bodies[this.bodySelected].shapeDefinition.w/2);
					this.controlPoint.loc.y = bodyPos.y;
					break;
			}
			break;
	}	
	
	this.animationPreviewState = "play";
	this.animationPreview = setInterval(function(){
		if(PE.animationPreviewState == "play"){
			
			ctx.save();
			ctx.setTransform(1,0,0,1,0,0);
			ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
			ctx.restore();
			
			ctx.save();
			//put 0,0 of the context to the center of the canvas
			ctx.translate((sizeOfCanvas.w/2),(sizeOfCanvas.h/2));
			
			ctx.strokeStyle = "#0091a5";
			ctx.fillStyle = "#0091a5";
			ctx.lineWidth = 1;
			
			var numBodies = PE.bodies.length;
			for(var b=0;b<numBodies;b++){
				
				var bodyPos = {x:0,y:0};
				if(b != 0){
					bodyPos.x = PE.bodies[b].position.x + PE.bodies[PE.bodies[b].parentBody].position.x;
					bodyPos.y = PE.bodies[b].position.y + PE.bodies[PE.bodies[b].parentBody].position.y;
				}
				
				//draw sprites
				if(PE.bodies[b].spriteSheet != null){
					var spriteSheet = FLAG.Scene.spriteSheets[PE.bodies[b].spriteSheet];
					var rect = spriteSheet.tileRects[PE.bodies[b].frame];
					var point = {x:bodyPos.x-(rect.w/2)+spriteSheet.offset.x, y:bodyPos.y-(rect.h/2)+spriteSheet.offset.y};
					if(PE.bodies[b].animation != null){
						var animationOffset = {x:Math.floor(spriteSheet.animations[PE.bodies[b].animation].offset.x), y:Math.floor(spriteSheet.animations[PE.bodies[b].animation].offset.y)};
						point.x += animationOffset.x;
						point.y += animationOffset.y;
					}
					ctx.drawImage(spriteSheet.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				}
			
				switch(PE.bodies[PE.bodySelected].shape){
					case "box":						
						if(b == PE.bodySelected){
							//draw selected body outline
							ctx.strokeRect(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y - (PE.bodies[PE.bodySelected].shapeDefinition.h/2),PE.bodies[PE.bodySelected].shapeDefinition.w,PE.bodies[PE.bodySelected].shapeDefinition.h);
							
							//draw control point
							ctx.beginPath();
							ctx.arc(PE.controlPoint.loc.x,PE.controlPoint.loc.y,PE.controlPoint.radius,0,2*Math.PI, false);
							ctx.fill();
						}
						break;
					case "circle":
						
						if(b == PE.bodySelected){
							//draw selected body outline
							ctx.beginPath();
							ctx.arc(bodyPos.x,bodyPos.y,PE.bodies[PE.bodySelected].shapeDefinition.radius,0,2*Math.PI, false);
							ctx.stroke();
							
							//draw control point
							ctx.beginPath();
							ctx.arc(PE.controlPoint.loc.x,PE.controlPoint.loc.y,PE.controlPoint.radius,0,2*Math.PI, false);
							ctx.fill();
						}
						break;
					case "poly":						
						//draw selected body outline
						if(b == PE.bodySelected){
							//draw selected body outline
							ctx.beginPath();
							ctx.moveTo(bodyPos.x + PE.controlPoint.polyLoc[0].x,bodyPos.y + PE.controlPoint.polyLoc[0].y);
							for(var p=1;p<PE.numPoints;p++){
								ctx.lineTo(bodyPos.x + PE.controlPoint.polyLoc[p].x,bodyPos.y + PE.controlPoint.polyLoc[p].y);
							}
							ctx.closePath();
							ctx.stroke();
							
							//draw control points
							for(var p=0;p<PE.numPoints;p++){
								ctx.beginPath();
								ctx.arc(bodyPos.x + PE.controlPoint.polyLoc[p].x,bodyPos.y + PE.controlPoint.polyLoc[p].y,PE.controlPoint.radius,0,2*Math.PI, false);
								ctx.fill();
							}
						}
						break;
					case "tile":
						//draw selected body outline
						if(b == PE.bodySelected){
							switch(FLAG.Scene.Map.type){
								case "orthogonal":
									//draw selected body outline
									ctx.strokeRect(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y - (PE.bodies[PE.bodySelected].shapeDefinition.h/2),PE.bodies[PE.bodySelected].shapeDefinition.w,PE.bodies[PE.bodySelected].shapeDefinition.h);
									
									//draw control point
									ctx.beginPath();
									ctx.arc(PE.controlPoint.loc.x,PE.controlPoint.loc.y,PE.controlPoint.radius,0,2*Math.PI, false);
									ctx.fill();
									break;
								case "isometric":
									//draw selected body outline
									ctx.beginPath();
									ctx.moveTo(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y);
									ctx.lineTo(bodyPos.x,bodyPos.y - (PE.bodies[PE.bodySelected].shapeDefinition.h/2));
									ctx.lineTo(bodyPos.x + (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y);
									ctx.lineTo(bodyPos.x,bodyPos.y + (PE.bodies[PE.bodySelected].shapeDefinition.h/2));
									ctx.closePath();
									ctx.stroke();
									
									//draw control point
									ctx.beginPath();
									ctx.arc(PE.controlPoint.loc.x,PE.controlPoint.loc.y,PE.controlPoint.radius,0,2*Math.PI, false);
									ctx.fill();
									break;
								case "hexagonal":
									//draw selected body outline
									ctx.beginPath();
									ctx.moveTo(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y);
									ctx.lineTo(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/4),bodyPos.y - (PE.bodies[PE.bodySelected].shapeDefinition.h/2));
									ctx.lineTo(bodyPos.x + (PE.bodies[PE.bodySelected].shapeDefinition.w/4),bodyPos.y - (PE.bodies[PE.bodySelected].shapeDefinition.h/2));
									ctx.lineTo(bodyPos.x + (PE.bodies[PE.bodySelected].shapeDefinition.w/2),bodyPos.y);
									ctx.lineTo(bodyPos.x + (PE.bodies[PE.bodySelected].shapeDefinition.w/4),bodyPos.y + (PE.bodies[PE.bodySelected].shapeDefinition.h/2));
									ctx.lineTo(bodyPos.x - (PE.bodies[PE.bodySelected].shapeDefinition.w/4),bodyPos.y + (PE.bodies[PE.bodySelected].shapeDefinition.h/2));							
									ctx.closePath();
									ctx.stroke();
									
									//draw control point
									ctx.beginPath();
									ctx.arc(PE.controlPoint.loc.x,PE.controlPoint.loc.y,PE.controlPoint.radius,0,2*Math.PI, false);
									ctx.fill();
									break;
							}	
						}			
						break;
			
				}
			}
			
			ctx.restore();
		}
		
	},1000/15);
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS PREVIEW



//ASSETS ACTORS PREVIEW MOUSE DOWN
//Mouse down actions that occur on the actor preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_preview_mouseDown = function(e){	
	//check if on any control points
	this.controlPoint.active = false;

	//pointer position
	//adjust pointer numbers to allow for context adjustment
	var x = FLAG.Pointer.screenLoc.x-500;
	var y = FLAG.Pointer.screenLoc.y-500;
	
	//position of the body
	var bodyPos = {x:0,y:0};
	if(this.bodySelected != 0){
		bodyPos.x = this.bodies[this.bodySelected].position.x + this.bodies[this.bodies[this.bodySelected].parentBody].position.x;
		bodyPos.y = this.bodies[this.bodySelected].position.y + this.bodies[this.bodies[this.bodySelected].parentBody].position.y;
	}
	
	switch(this.bodies[this.bodySelected].shape){
		case "box":	
			if(FLAG.pointInCircle({x:x,y:y},this.controlPoint.loc,this.controlPoint.radius) == true){
				this.controlPoint.active = true;
				this.controlPoint.loc.x = x;
				this.controlPoint.loc.y = y;
				
				//adjust box size
				this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
				this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));	
				//adjust html
				document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
				document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
			}
			break;
		case "circle":	
			if(FLAG.pointInCircle({x:x,y:y},this.controlPoint.loc,this.controlPoint.radius) == true){
				this.controlPoint.active = true;
				this.controlPoint.loc.x = x;
				this.controlPoint.loc.y = bodyPos.y;
				
				//adjust circle size
				this.bodies[this.bodySelected].shapeDefinition.radius = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)));
				//adjust html
				document.getElementById("radius").value = this.bodies[this.bodySelected].shapeDefinition.radius;
			}
			break;
		case "poly":
			this.controlPoint.polyIndex = null;
			//check all control points in the polygon
			for(var p=0;p<this.numPoints;p++){
				if(FLAG.pointInCircle({x:x,y:y},{x:bodyPos.x + this.controlPoint.polyLoc[p].x,y:bodyPos.y + this.controlPoint.polyLoc[p].y},this.controlPoint.radius) == true){
					this.controlPoint.active = true;
					this.controlPoint.polyIndex = p;
				}
			}
			
			if(this.controlPoint.polyIndex != null){
				//adjust point location
				this.controlPoint.polyLoc[this.controlPoint.polyIndex].x = x - bodyPos.x;
				this.controlPoint.polyLoc[this.controlPoint.polyIndex].y = y - bodyPos.y;
				this.bodies[this.bodySelected].shapeDefinition[this.controlPoint.polyIndex].x = x - bodyPos.x;
				this.bodies[this.bodySelected].shapeDefinition[this.controlPoint.polyIndex].y = y - bodyPos.y;
				//adjust html
				document.getElementById("point_"+this.controlPoint.polyIndex+"_x").value = x - bodyPos.x;
				document.getElementById("point_"+this.controlPoint.polyIndex+"_y").value = y - bodyPos.y;
			}
			break;
		case "tile":
			switch(FLAG.Scene.Map.type){
				case "orthogonal":
					this.controlPoint.active = true;
					this.controlPoint.loc.x = x;
					this.controlPoint.loc.y = y;
				
					//adjust box size
					this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
					this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));	
					//adjust html
					document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
					document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
					break;
				case "isometric":
					this.controlPoint.active = true;
					this.controlPoint.loc.x = bodyPos.x;
					this.controlPoint.loc.y = y;
				
					//adjust box size
					this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));
					this.bodies[this.bodySelected].shapeDefinition.w = this.bodies[this.bodySelected].shapeDefinition.h * 2;
						
					//adjust html
					document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
					document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
					break;
				case "hexagonal":
					this.controlPoint.active = true;
					this.controlPoint.loc.x = x;
					this.controlPoint.loc.y = bodyPos.y;
					
					//adjust box size
					this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
					this.bodies[this.bodySelected].shapeDefinition.h = this.bodies[this.bodySelected].shapeDefinition.w;	
					//adjust html
					document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
					document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
					break;
			}
			break;
	}	
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS PREVIEW MOUSE DOWN



//ASSETS ACTORS PREVIEW MOUSE MOVE
//Mouse move actions that occur on the actor preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_preview_mouseMove = function(e){
	//adjust pointer numbers to allow for context adjustment
	var x = Math.floor(FLAG.Pointer.screenLoc.x-500);
	var y = Math.floor(FLAG.Pointer.screenLoc.y-500);
	
	if(this.controlPoint.active == true){
		this.controlPoint.loc.x = x;
		this.controlPoint.loc.y = y;
		
		//position of the body
		var bodyPos = {x:0,y:0};
		if(this.bodySelected != 0){
			bodyPos.x = this.bodies[this.bodySelected].position.x + this.bodies[this.bodies[this.bodySelected].parentBody].position.x;
			bodyPos.y = this.bodies[this.bodySelected].position.y + this.bodies[this.bodies[this.bodySelected].parentBody].position.y;
		}
		
		//special case for circle shape - loc y
		if(this.bodies[this.bodySelected].shape == "circle"){
			this.controlPoint.loc.y = bodyPos.y;
		}
		
		//special case for tile and isometric shape - lock x
		if(this.bodies[this.bodySelected].shape == "tile" && FLAG.Scene.Map.type == "isometric"){
			this.controlPoint.loc.x = bodyPos.x;
		}
		
		//special case for tile and isometric shape - lock y
		if(this.bodies[this.bodySelected].shape == "tile" && FLAG.Scene.Map.type == "hexagonal"){
			this.controlPoint.loc.y = bodyPos.y;
		}
		
		switch(this.bodies[this.bodySelected].shape){
			case "box":	
				//adjust box size
				this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
				this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));	
				//adjust html
				document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
				document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
				break;
			case "circle":
				//adjust circle size
				this.bodies[this.bodySelected].shapeDefinition.radius = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)));
				//adjust html
				document.getElementById("radius").value = this.bodies[this.bodySelected].shapeDefinition.radius;
				break;
			case "poly":
				//adjust point location
				this.controlPoint.polyLoc[this.controlPoint.polyIndex].x = x - bodyPos.x;
				this.controlPoint.polyLoc[this.controlPoint.polyIndex].y = y - bodyPos.y;
				this.bodies[this.bodySelected].shapeDefinition[this.controlPoint.polyIndex].x = x - bodyPos.x;
				this.bodies[this.bodySelected].shapeDefinition[this.controlPoint.polyIndex].y = y - bodyPos.y;
				//adjust html
				document.getElementById("point_"+this.controlPoint.polyIndex+"_x").value = x - bodyPos.x;
				document.getElementById("point_"+this.controlPoint.polyIndex+"_y").value = y - bodyPos.y;
				break;
			case "tile":
				switch(FLAG.Scene.Map.type){
					case "orthogonal":
						//adjust box size
						this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
						this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));	
						//adjust html
						document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
						document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
						break;
					case "isometric":
						//adjust box size
						this.bodies[this.bodySelected].shapeDefinition.h = Math.floor(Math.abs((this.controlPoint.loc.y - bodyPos.y)*2));	
						this.bodies[this.bodySelected].shapeDefinition.w = this.bodies[this.bodySelected].shapeDefinition.h * 2;
						
						//adjust html
						document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
						document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
						break;
					case "hexagonal":
						//adjust box size
						this.bodies[this.bodySelected].shapeDefinition.w = Math.floor(Math.abs((this.controlPoint.loc.x - bodyPos.x)*2));
						this.bodies[this.bodySelected].shapeDefinition.h = this.bodies[this.bodySelected].shapeDefinition.w;	
						//adjust html
						document.getElementById("box_w").value = this.bodies[this.bodySelected].shapeDefinition.w;
						document.getElementById("box_h").value = this.bodies[this.bodySelected].shapeDefinition.h;
						break;
				}
				break;
		}
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS PREVIEW MOUSE MOVE



//ASSETS ACTORS REMOVE
//Removes an actor from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_remove = function(){
	var numActors = POLE.actors.length;
	var actorsToKeep = [];
	var selectedIndex = -1;
	for(var i=0;i<numActors;i++){
		if(document.getElementById("actorsList_"+i).className == "button_unselected"){
			actorsToKeep.push(POLE.actors[i]);
		}else{
			selectedIndex = i;
		}
	}	
	
	if(selectedIndex != -1){
		this.undo_create();
		POLE.actors = actorsToKeep;
		actorsToKeep = [];
		this.actorSelected = -1;
		
		//remove any actors in scenes that used the removed actor
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numActorsInScene = POLE.scenes[s].actors.length;
			var actorsToKeep = [];
			for(var a=0;a<numActorsInScene;a++){
				if(POLE.scenes[s].actors[a].pIndex != selectedIndex){
					//reduce the actor number by one if it is higher than the one removed
					if(POLE.scenes[s].actors[a].pIndex > selectedIndex){
						POLE.scenes[s].actors[a].pIndex -= 1;
					}
					actorsToKeep.push(POLE.scenes[s].actors[a]);
				}
			}
			POLE.scenes[s].actors = actorsToKeep;
			actorsToKeep = [];
		}
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS REMOVE



//ASSETS ACTORS SELECT
//Selects an actor from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_actors_select = function(which){
	var numActors = POLE.actors.length;
	for(var i=0;i<numActors;i++){
		document.getElementById("actorsList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var actorNum = which.id.slice(11);
	this.actorSelected = Number(actorNum);
	
	//activates the tool that can add an actor to the scene
	this.tools_select(document.getElementById("tool_addActor"));
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editActor"){
		PE.menus_popUps('editActor');
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS SELECT

//----------------------------------------------------------------------------------------------
//END ASSETS ACTORS



//ASSETS IMAGES
//----------------------------------------------------------------------------------------------

//ASSETS IMAGES ADD
//Adds an image to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_images_add = function(){
	if(document.getElementById("imageName").value != "" && document.getElementById("imageURL").value != ""){
		this.undo_create();
		POLE.images.push({name:document.getElementById("imageName").value,url:document.getElementById("imageURL").value});
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES ADD



//ASSETS IMAGES EDIT
//Edits an image in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_images_edit = function(){
	var numImageSelected = -1;
	var numImages = POLE.images.length;
	for(var i=0;i<numImages;i++){
		if(document.getElementById("imageList_"+i).className == "button_selected"){
			numImageSelected = i;
		}
	}	
	if(document.getElementById("imageURL").value != "" && document.getElementById("imageList").selectedIndex != -1){
		this.undo_create();
		POLE.images[numImageSelected].name = document.getElementById("imageName").value;
		POLE.images[numImageSelected].url = document.getElementById("imageURL").value;
	}
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES EDIT



//ASSETS IMAGES OPEN
//Previews an image in a new browser window
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_images_open = function(which){
	var imageNum = which.id.slice(10);
	var newWin = window.open(POLE.images[Number(imageNum)].url,'','');
	newWin.focus();
}
//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES OPEN



//ASSETS IMAGES REMOVE
//Removes an image from the list, and anywhere else it was used
//Adjusts all image indexes accordingly
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_images_remove = function(){
	var numImageSelected = -1;
	var numImages = POLE.images.length;
	var imagesToKeep = [];
	for(var i=0;i<numImages;i++){
		if(document.getElementById("imageList_"+i).className == "button_unselected"){
			imagesToKeep.push(POLE.images[i]);
		}else{
			numImageSelected = i;
		}
	}	
	
	if(numImageSelected != -1){
		this.undo_create();		
		POLE.images = imagesToKeep;
		imagesToKeep = [];
		
		//check if any scenes are using the image as a background image
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			if(POLE.scenes[s].bgImage == numImageSelected){
				POLE.scenes[s].bgImage = null;
			}else if(POLE.scenes[s].bgImage > numImageSelected){
				POLE.scenes[s].bgImage -= 1;
			}
		}
		
		
		//remove any sheets or objects that used the removed image
		//tileSheets
		var numTileSheets = POLE.tileSheets.length;
		var tileSheetsToKeep = [];		
		var keepNums = [];
		var loseNums = [];
		for(var i=0;i<numTileSheets;i++){
			if(POLE.tileSheets[i].image != numImageSelected){
				tileSheetsToKeep.push(POLE.tileSheets[i]);
				keepNums.push(Number(i));
			}else{
				loseNums.push(Number(i));
			}
		}
		POLE.tileSheets = tileSheetsToKeep;
		tileSheetsToKeep = [];
		
		//adjust images of sheets that were kept
		numTileSheets = POLE.tileSheets.length;
		for(var i=0;i<numTileSheets;i++){
			if(POLE.tileSheets[i].image > numImageSelected){
				POLE.tileSheets[i].image -= 1;
			}
		}		
	
		//remove tileIDs, tileSheetIDs and tileSprites
		var numLose = loseNums.length;
		var numScenes = POLE.scenes.length;
		for(var tsr=0;tsr<numLose;tsr++){
			for(var s=0;s<numScenes;s++){
				
				//tileSprites
				var numTileSprites = POLE.scenes[s].tileSprites.length;
				var tileSpritesToKeep = [];
				for(var ts=0;ts<numTileSprites;ts++){
					if(POLE.scenes[s].tileSprites[ts].pIndex != loseNums[tsr]){
						tileSpritesToKeep.push(POLE.scenes[s].tileSprites[ts]);
					}
				}
				POLE.scenes[s].tileSprites = tileSpritesToKeep;
				tileSpritesToKeep = [];
				
				//tiles
				var numLayers = POLE.scenes[s].layers.length;
				for(var l=0;l<numLayers;l++){	
					for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
						for(var c=0;c<POLE.scenes[s].tilesWide;c++){
							if(POLE.scenes[s].layers[l].tileSheetIDs[r][c] == loseNums[tsr]){
								POLE.scenes[s].layers[l].tileSheetIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileIDs[r][c] = 0;
							}
						}
					}
				}		
			}
		}
		
		//adjust keeps
		var adjusted_keepNums = [];
		var numKeeps = keepNums.length;
		var numLose = loseNums.length;
		for(var k=0;k<numKeeps;k++){
			var adjustment = 0;
			for(var l=0;l<numLose;l++){
				if(loseNums[l] < keepNums[k]){
					adjustment += 1;
				}
			}
			adjusted_keepNums.push(keepNums[k]-adjustment);
		}
				
		//replace tileSheetIDs and tileSprites
		var numKeeps = keepNums.length;
		for(var tsk=0;tsk<numKeeps;tsk++){
			for(var s=0;s<numScenes;s++){
				
				//tileSprites
				var numTileSprites = POLE.scenes[s].tileSprites.length;
				for(var ts=0;ts<numTileSprites;ts++){
					if(POLE.scenes[s].tileSprites[ts].pIndex  == keepNums[tsk]){
						POLE.scenes[s].tileSprites[ts].pIndex = adjusted_keepNums[tsk];
					}
				}
			
				//tiles
				var numLayers = POLE.scenes[s].layers.length;
				for(var l=0;l<numLayers;l++){	
					for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
						for(var c=0;c<POLE.scenes[s].tilesWide;c++){
							if(POLE.scenes[s].layers[l].tileSheetIDs[r][c] == keepNums[tsk]){
								POLE.scenes[s].layers[l].tileSheetIDs[r][c] = adjusted_keepNums[tsk];
							}
						}
					}
				}		
			}
		}
		
		//tiledObjectSheets
		var numTiledObjectSheets = POLE.tiledObjectSheets.length;
		var tiledObjectSheetsToKeep = [];
		var keepNums = [];
		var loseNums = [];
		for(var i=0;i<numTiledObjectSheets;i++){
			if(POLE.tiledObjectSheets[i].image != numImageSelected){
				tiledObjectSheetsToKeep.push(POLE.tiledObjectSheets[i]);
				keepNums.push(Number(i));
			}else{
				loseNums.push(Number(i));
				var numScenes = POLE.scenes.length;
				for(var s=0;s<numScenes;s++){
					var numTiledObjects = POLE.scenes[s].tiledObjects.length;
					var tiledObjectsToKeep = [];
					for(var to=0;to<numTiledObjects;to++){
						if(POLE.scenes[s].tiledObjects[to].pIndex == i){
							//remove tiled object from arrays
							var numRows = POLE.tiledObjectSheets[i].numTiles.h;
							var numCols = POLE.tiledObjectSheets[i].numTiles.w;
							var row = POLE.scenes[s].tiledObjects[to].row;
							var col = POLE.scenes[s].tiledObjects[to].col;
							for(var r=0;r<numRows;r++){
								for(var c=0;c<numCols;c++){
									POLE.scenes[s].layers[POLE.scenes[s].tiledObjects[to].layer].tileIDs[row+r][col+c] = 0;
									POLE.scenes[s].layers[POLE.scenes[s].tiledObjects[to].layer].tiledObjectIDs[row+r][col+c] = 0;
								}
							}
						}else{
							tiledObjectsToKeep.push(POLE.scenes[s].tiledObjects[to]);
						}					
					}
					POLE.scenes[s].tiledObjects = tiledObjectsToKeep;
					tiledObjectsToKeep = [];
				}
			}
		}
		POLE.tiledObjectSheets = tiledObjectSheetsToKeep;
		tiledObjectSheetsToKeep = [];
		
		//tiledObjectSheets
		var numTiledObjectSheets = POLE.tiledObjectSheets.length;
		for(var i=0;i<numTiledObjectSheets;i++){
			if(POLE.tiledObjectSheets[i].image > numImageSelected){
				POLE.tiledObjectSheets[i].image -= 1;
			}
		}
		var adjusted_keepNums = [];
		var numKeeps = keepNums.length;
		var numLose = loseNums.length;
		for(var k=0;k<numKeeps;k++){
			var adjustment = 0;
			for(var l=0;l<numLose;l++){
				if(loseNums[l] < keepNums[k]){
					adjustment += 1;
				}
			}
			adjusted_keepNums.push(keepNums[k]-adjustment);
		}
		
		//tiledObjects
		for(var s=0;s<numScenes;s++){
			var numTiledObjects = POLE.scenes[s].tiledObjects.length;
			for(var to=0;to<numTiledObjects;to++){	
				for(var k=0;k<numKeeps;k++){
					if(POLE.scenes[s].tiledObjects[to].pIndex == keepNums[k]){
						POLE.scenes[s].tiledObjects[to].pIndex = adjusted_keepNums[k];
					}
				}
			}
		}
		
		
		//spriteSheets
		var numSpriteSheets = POLE.spriteSheets.length;
		var actorSheetsToKeep = [];
		var keepNums = [];
		var loseNums = [];
		for(var i=0;i<numSpriteSheets;i++){
			if(POLE.spriteSheets[i].image != numImageSelected){
				actorSheetsToKeep.push(POLE.spriteSheets[i]);
				keepNums.push(Number(i));
			}else{
				loseNums.push(Number(i));
			}
		}
		POLE.spriteSheets = actorSheetsToKeep;
		actorSheetsToKeep = [];
		
		//spriteSheets
		var numSpriteSheets = POLE.spriteSheets.length;
		for(var i=0;i<numSpriteSheets;i++){
			if(POLE.spriteSheets[i].image > numImageSelected){
				POLE.spriteSheets[i].image -= 1;
			}
		}
		var adjusted_keepNums = [];
		var numKeeps = keepNums.length;
		var numLose = loseNums.length;
		for(var k=0;k<numKeeps;k++){
			var adjustment = 0;
			for(var l=0;l<numLose;l++){
				if(loseNums[l] < keepNums[k]){
					adjustment += 1;
				}
			}
			adjusted_keepNums.push(keepNums[k]-adjustment);
		}
		
		//sprites
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numSprites = POLE.scenes[s].sprites.length;
			var spritesToKeep = [];
			for(var d=0;d<numSprites;d++){
				for(var k=0;k<numKeeps;k++){
					if(POLE.scenes[s].sprites[d].pIndex == keepNums[k]){
						POLE.scenes[s].sprites[d].pIndex = adjusted_keepNums[k];
						spritesToKeep.push(POLE.scenes[s].sprites[d]);
					}
				}			
			}
			POLE.scenes[s].sprites = spritesToKeep;
			spritesToKeep = [];
		}
		
		//actors
		//reassign all spriteSheets 
		var numActors = POLE.actors.length;
		for(var i=0;i<numActors;i++){
			var numBodies = POLE.actors[i].bodies.length;
			for(var b=0;b<numBodies;b++){
				var keepNumFound = false;
				for(var k=0;k<numKeeps;k++){
					if(POLE.actors[i].bodies[b].spriteSheet == keepNums[k]){
						POLE.actors[i].bodies[b].spriteSheet = adjusted_keepNums[k];
						keepNumFound = true;
					}
				}
				
				if(keepNumFound == false){
					POLE.actors[i].bodies[b].spriteSheet = null;
					POLE.actors[i].bodies[b].animation = null;
					POLE.actors[i].bodies[b].frame = null;
				}			
			}
		}
		
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES REMOVE



//ASSETS IMAGES SELECT
//Selects an image from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_images_select = function(which){
	var numImages = POLE.images.length;
	for(var i=0;i<numImages;i++){
		document.getElementById("imageList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var imageNum = which.id.slice(10);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editImage"){
		document.getElementById("imageName").value = POLE.images[Number(imageNum)].name;
		document.getElementById("imageURL").value = POLE.images[Number(imageNum)].url;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES SELECT

//----------------------------------------------------------------------------------------------
//END ASSETS IMAGES



//ASSETS SHEETS PREVIEW
//----------------------------------------------------------------------------------------------

//ASSETS SHEETS PREVIEW DRAW
//Draws a preview of a sheet
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sheetsPreview_draw = function(){
	document.getElementById("sheetCanvasContainer").innerHTML = "";
	var imageIndex = -1;
	
	//TILE SHEETS
	if(document.getElementById("popUp").className == "addTileSheet" || document.getElementById("popUp").className == "editTileSheet"){
		imageIndex = document.getElementById("imageSelect").selectedIndex;
		var tilesHigh = Number(document.getElementById("tileSheet_numVertical").value);
		var tilesWide = Number(document.getElementById("tileSheet_numHorizontal").value);
		var tileWidth = Number(document.getElementById("tileSheet_tile_Width").value);
		var tileHeight = Number(document.getElementById("tileSheet_tile_Height").value);
		var origin = {x:Number(document.getElementById("tileSheet_originX").value)*this.tileSheetScale,y:Number(document.getElementById("tileSheet_originY").value)*this.tileSheetScale};
	
	//TILED OBJECT SHEETS
	}else if(document.getElementById("popUp").className == "addTiledObjectSheet" || document.getElementById("popUp").className == "editTiledObjectSheet"){
		imageIndex = document.getElementById("imageSelect").selectedIndex;
		var tilesHigh = Number(document.getElementById("tileSheet_numVertical").value);
		var tilesWide = Number(document.getElementById("tileSheet_numHorizontal").value);
		var tileWidth = Number(document.getElementById("tileSheet_tile_Width").value);
		var tileHeight = Number(document.getElementById("tileSheet_tile_Height").value);
		var origin = {x:Number(document.getElementById("tileSheet_originX").value)*this.tileSheetScale,y:Number(document.getElementById("tileSheet_originY").value)*this.tileSheetScale};
		var frame = {w:Number(document.getElementById("frameSizeW").value), h:Number(document.getElementById("frameSizeH").value)};
		var numFrames = {w:Number(document.getElementById("numFramesW").value), h:Number(document.getElementById("numFramesH").value)};
		
	//SPRITE SHEETS
	}else if(document.getElementById("popUp").className == "addSpriteSheet" || document.getElementById("popUp").className == "editSpriteSheet"){
		imageIndex = document.getElementById("imageSelect").selectedIndex;
		var tilesHigh = Number(document.getElementById("tileSheet_numVertical").value);
		var tilesWide = Number(document.getElementById("tileSheet_numHorizontal").value);
		var tileWidth = Number(document.getElementById("tileSheet_tile_Width").value);
		var tileHeight = Number(document.getElementById("tileSheet_tile_Height").value);
		var origin = {x:Number(document.getElementById("tileSheet_originX").value)*this.tileSheetScale,y:Number(document.getElementById("tileSheet_originY").value)*this.tileSheetScale};
	
	//TILE ANIMATION SHEETS
	}else if(document.getElementById("popUp").className == "addTileSheetAnimation" || document.getElementById("popUp").className == "editTileSheetAnimation"){
		imageIndex = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].image;
		var tilesHigh = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.h;
		var tilesWide = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.w;
		var tileWidth = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].tileDimensions.w;
		var tileHeight = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].tileDimensions.h;
		var origin = {x:POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].origin.x*this.tileSheetScale,y:POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].origin.y*this.tileSheetScale};
	
	//TILED OBJECT ANIMATION SHEETS
	}else if(document.getElementById("popUp").className == "addTiledObjectSheetAnimation" || document.getElementById("popUp").className == "editTiledObjectSheetAnimation"){
		imageIndex = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].image;
		var tilesHigh = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numTiles.h;
		var tilesWide = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numTiles.w;
		var tileWidth = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].tileDimensions.w;
		var tileHeight = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].tileDimensions.h;
		var origin = {x:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].origin.x*this.tileSheetScale,y:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].origin.y*this.tileSheetScale};
		var frame = {w:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.w, h:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.h};
		var numFrames = {w:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numFrames.w, h:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numFrames.h};
	
	//SPRITE SHEET ANIMATIONS
	}else if(document.getElementById("popUp").className == "addSpriteSheetAnimation" || document.getElementById("popUp").className == "editSpriteSheetAnimation"){
		imageIndex = POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].image;
		var tilesHigh = POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].numTiles.h;
		var tilesWide = POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].numTiles.w;
		var tileWidth = POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].tileDimensions.w;
		var tileHeight = POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].tileDimensions.h;
		var origin = {x:POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].origin.x*this.tileSheetScale,y:POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].origin.y*this.tileSheetScale};
	}
	
	if(imageIndex != -1){
		document.getElementById("sheetCanvasContainer").innerHTML = '<canvas class="sheetImage" id="sheetImage" width='+Number(FLAG.Scene.images[imageIndex].width*this.tileSheetScale)+' height='+(FLAG.Scene.images[imageIndex].height*this.tileSheetScale)+'></canvas>';	
		var c=document.getElementById("sheetImage");
		var ctx=c.getContext("2d");
		ctx.clearRect(0, 0, FLAG.Scene.images[imageIndex].width*this.tileSheetScale,FLAG.Scene.images[imageIndex].height*this.tileSheetScale);
		var img=FLAG.Scene.images[imageIndex];
		ctx.save();
		ctx.scale(this.tileSheetScale,this.tileSheetScale);
		ctx.drawImage(img,0,0,FLAG.Scene.images[imageIndex].width,FLAG.Scene.images[imageIndex].height);
		ctx.restore();
		var gridPoints = [];
		var array_Seg = [];		
		var gridColor = "#0091a5"; 
		switch(this.tileSheetGridColor){
			case "blue":
				gridColor = "#0091a5";
				break;
			case "black":
				gridColor = "#000";
				break;
			case "white":
				gridColor = "#fff";
				break;
		}
		
		if(this.tileSheetGridColor != "none"){
			//spriteSheets start at 0
			var tileCounter = 0;
			if(document.getElementById("popUp").className == "addTileSheet" || document.getElementById("popUp").className == "editTileSheet" || document.getElementById("popUp").className == "addTileSheetAnimation" || document.getElementById("popUp").className == "editTileSheetAnimation"){
				//regular tileSheets and tiled object sheets start at 1 because 0 is blank
				tileCounter = 1;
			}
				
			//tiled objects preview
			if(document.getElementById("popUp").className == "addTiledObjectSheet" || document.getElementById("popUp").className == "editTiledObjectSheet" || document.getElementById("popUp").className == "addTiledObjectSheetAnimation" || document.getElementById("popUp").className == "editTiledObjectSheetAnimation"){
		
				var framePoints = [];
				gridPoints = [];
				array_Seg = [];
				for (var i = 0; i<tilesHigh; i++){
					for (var j = 0; j<tilesWide; j++){
						if(POLE.scenes[this.sceneSelected].type == "isometric"){
							array_Seg.push ({x:(j*(tileWidth*this.tileSheetScale))+((tileWidth*this.tileSheetScale)/2)-(((tileWidth*this.tileSheetScale)/2)*j)+(((tileWidth*this.tileSheetScale)/2)*(tilesHigh-1-i)),y:(i*(tileHeight*this.tileSheetScale)-(((tileHeight*this.tileSheetScale)/2)*(tilesWide-1-j))+(((tileHeight*this.tileSheetScale)/2)*(tilesHigh-1-i)))});
						}else{
							array_Seg.push ({x:(j*(tileWidth*this.tileSheetScale)),y:(i*(tileHeight*this.tileSheetScale))});
						}
					};		
					gridPoints.push (array_Seg);
					array_Seg = [];
				}		
			
				array_Seg = [];
			
				for (var i = 0; i<numFrames.h; i++){
					for (var j = 0; j<numFrames.w; j++){
						array_Seg.push ({x:(j*(frame.w*this.tileSheetScale)),y:(i*(frame.h*this.tileSheetScale))});
					};		
					framePoints.push (array_Seg);
					array_Seg = [];
				}
			
				var frameCounter = 0;
				tileCounter = 1;
				var heightOfTiles = ((tilesHigh * tileHeight)*this.tileSheetScale);
				for (var i = 0; i<numFrames.h; i++){
					for (var j = 0; j<numFrames.w; j++){
					
						tileCounter = 1;
						for (var k = 0; k<tilesHigh; k++){
							for (var l = 0; l<tilesWide; l++){
								ctx.strokeStyle = gridColor;
								
								
								var x = gridPoints[k][l].x + origin.x + framePoints[i][j].x;
								var y = gridPoints[k][l].y + origin.y + framePoints[i][j].y + ((frame.h*this.tileSheetScale) - heightOfTiles);
								ctx.lineWidth = 1;
								
								if(POLE.scenes[this.sceneSelected].type == "isometric"){
									ctx.beginPath();
									ctx.moveTo(x,y);
									ctx.lineTo(x+((tileWidth*this.tileSheetScale)/2),y+((tileHeight*this.tileSheetScale)/2));
									ctx.lineTo(x,y+(tileHeight*this.tileSheetScale));
									ctx.lineTo(x-((tileWidth*this.tileSheetScale)/2),y+((tileHeight*this.tileSheetScale)/2));
									ctx.closePath();
									ctx.lineWidth = 1;
									ctx.stroke();
									
									ctx.font = '12pt OpenSans';
									ctx.fillStyle = gridColor;
									ctx.fillText(tileCounter, x, y+((tileHeight*this.tileSheetScale)/2));
								}else{
									ctx.strokeRect(x,y,(tileWidth*this.tileSheetScale),(tileHeight*this.tileSheetScale));
									ctx.lineWidth = 1;
									
									ctx.font = '12pt OpenSans';
									ctx.fillStyle = gridColor;
									ctx.fillText(tileCounter, x+2, y+14);
								}
								
								tileCounter += 1;
							}
						}
				
						ctx.strokeStyle = "#000000";
						var x = framePoints[i][j].x + origin.x; 
						var y = framePoints[i][j].y + origin.y;
						ctx.lineWidth = 1;
						ctx.strokeRect(x,y,(frame.w*this.tileSheetScale),(frame.h*this.tileSheetScale));
						ctx.font = '12pt OpenSans';
						ctx.fillStyle = "#000000";
						ctx.fillText("Frame " + frameCounter, x+2, y+14);
						frameCounter += 1;
					}
				}
			
			//tile sheets and sprite sheets preview
			}else{
				for (var i = 0; i<tilesHigh; i++){
					for (var j = 0; j<tilesWide; j++){
						array_Seg.push ({x:(j*(tileWidth*this.tileSheetScale)),y:(i*(tileHeight*this.tileSheetScale))});
					};		
					gridPoints.push (array_Seg);
					array_Seg = [];
				}
		
				for (var i = 0; i<tilesHigh; i++){
					for (var j = 0; j<tilesWide; j++){
						ctx.strokeStyle = gridColor;
						var x = gridPoints[i][j].x + origin.x;
						var y = gridPoints[i][j].y + origin.y;
						ctx.lineWidth = 1;
						ctx.strokeRect(x,y,(tileWidth*this.tileSheetScale),(tileHeight*this.tileSheetScale));
						ctx.font = '12pt OpenSans';
						ctx.fillStyle = gridColor;
						ctx.fillText(tileCounter, x+2, y+14);
						tileCounter += 1;
					}
				}		
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SHEETS PREVIEW DRAW



//ASSETS SHEETS PREVIEW SCALE
//Scales the preview of the sheet
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sheetsPreview_scale = function(which){
	document.getElementById("sheetScale_3").className = "tileScale_unselected";
	document.getElementById("sheetScale_2").className = "tileScale_unselected";
	document.getElementById("sheetScale_1").className = "tileScale_unselected";
	document.getElementById("sheetScale_5").className = "tileScale_unselected";
	document.getElementById("sheetScale_25").className = "tileScale_unselected";
	
	switch(which.id){
			case "sheetScale_3":
				this.tileSheetScale = 3;
				break;
			case "sheetScale_2":
				this.tileSheetScale = 2;
				break;
			case "sheetScale_1":
				this.tileSheetScale = 1;
				break;
			case "sheetScale_5":
				this.tileSheetScale = .5;
				break
			case "sheetScale_25":
				this.tileSheetScale = .25;
				break;
	}
	document.getElementById(which.id).className = "tileScale_selected";
	this.assets_sheetsPreview_draw();
}
//----------------------------------------------------------------------------------------------
//END ASSETS SHEETS PREVIEW SCALE

//----------------------------------------------------------------------------------------------
//END ASSETS SHEETS PREVIEW



//ASSETS SOUNDS
//----------------------------------------------------------------------------------------------

//ASSETS SOUNDS ADD
//Adds a sound to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_add = function(){
	this.assets_sounds_preview_stop();
	if(document.getElementById("soundName").value != "" && document.getElementById("oggURL").value != "" && document.getElementById("mp3URL").value != ""){
		this.undo_create();
		POLE.sounds.push({name:document.getElementById("soundName").value,ogg:document.getElementById("oggURL").value,mp3:document.getElementById("mp3URL").value});
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS ADD



//ASSETS SOUNDS EDIT
//Edits a sound in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_edit = function(){
	this.assets_sounds_preview_stop();
	var numSoundSelected = -1;
	var numSounds = POLE.sounds.length;
	for(var i=0;i<numSounds;i++){
		if(document.getElementById("soundList_"+i).className == "button_selected"){
			numSoundSelected = i;
		}
	}	
	if(document.getElementById("soundName").value != "" && document.getElementById("oggURL").value != "" && document.getElementById("mp3URL").value != ""){
		this.undo_create();
		POLE.sounds[numSoundSelected].name = document.getElementById("soundName").value;
		POLE.sounds[numSoundSelected].ogg = document.getElementById("oggURL").value;
		POLE.sounds[numSoundSelected].mp3 = document.getElementById("mp3URL").value;
	}
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS EDIT



//ASSETS SOUNDS OPEN
//Opens a popUp menu for a sound
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_open = function(which){
	this.assets_sounds_preview_stop();
	var soundNum = which.id.slice(10);
	PE.menus_popUps('editSound');
	document.getElementById("soundName").value = POLE.sounds[Number(soundNum)].name;
	document.getElementById("oggURL").value = POLE.sounds[Number(soundNum)].ogg;
	document.getElementById("mp3URL").value = POLE.sounds[Number(soundNum)].mp3;
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS OPEN



//ASSETS SOUNDS PREVIEW PLAY
//Plays a preview of the sound
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_preview_play = function(){
	if(this.tempAudio != null){
		this.tempAudio.pause();
		delete this.tempAudio;
	}
	this.tempAudio = null;
	var audio = new Audio();
	var canPlayMP3 = (typeof audio.canPlayType === "function" &&
			  audio.canPlayType('audio/mpeg; codecs="mp3"') !== "");
	var canPlayOgg = (typeof audio.canPlayType === "function" &&
			  audio.canPlayType('audio/ogg; codecs="vorbis"') !== "");
	if(canPlayOgg == true){
		FLAG.audioType = "ogg";
		this.tempAudio = {};
		this.tempAudio = document.getElementById('testAudio');
		this.tempAudio.setAttribute('src',document.getElementById("oggURL").value);
		this.tempAudio.load();
	}else if(canPlayMP3 == true){		
		FLAG.audioType = "mp3";
		this.tempAudio = {};
		this.tempAudio = document.getElementById('testAudio');	
		this.tempAudio.setAttribute('src',document.getElementById("mp3URL").value);
		this.tempAudio.load();
	}
	
	if(this.tempAudio != null){
		this.tempAudio.play();
	}	
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS PREVIEW PLAY



//ASSETS SOUNDS PREVIEW STOP
//Stops a preview of the sound
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_preview_stop = function(){
	if(this.tempAudio != null){
		this.tempAudio.pause();
		delete this.tempAudio;
		this.tempAudio = null;
	}	
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS PREVIEW STOP



//ASSETS SOUNDS REMOVE
//Removes a sound from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_remove = function(){
	this.assets_sounds_preview_stop();
	var numSoundSelected = -1;
	var numSounds = POLE.sounds.length;
	var soundsToKeep = [];
	for(var i=0;i<numSounds;i++){
		if(document.getElementById("soundList_"+i).className == "button_unselected"){
			soundsToKeep.push(POLE.sounds[i]);
		}else{
			numSoundSelected = i;
		}
	}	
	
	if(numSoundSelected != -1){
		this.undo_create();		
		POLE.sounds = soundsToKeep;
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS REMOVE



//ASSETS SOUNDS SELECT
//Select a sound from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sounds_select = function(which){
	this.assets_sounds_preview_stop();
	var numSounds = POLE.sounds.length;
	for(var i=0;i<numSounds;i++){
		document.getElementById("soundList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var soundNum = which.id.slice(10);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editSound"){
		document.getElementById("soundName").value = POLE.sounds[Number(soundNum)].name;
		document.getElementById("oggURL").value = POLE.sounds[Number(soundNum)].ogg;
		document.getElementById("mp3URL").value = POLE.sounds[Number(soundNum)].mp3;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS SELECT

//----------------------------------------------------------------------------------------------
//END ASSETS SOUNDS



//ASSETS SPRITES
//----------------------------------------------------------------------------------------------

//ASSETS SPRITES ANIMATION ADD
//Adds an animation to a sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_add = function(){
	var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
	if(document.getElementById("animationName").value != "" && 
		document.getElementById("startFrame").value != "" &&
		document.getElementById("endFrame").value != "" &&
		document.getElementById("offsetX").value != "" &&
		document.getElementById("offsetY").value != ""){
		POLE.spriteSheets[spriteSheetIndex].animations.push({
			name:document.getElementById("animationName").value,
			startFrame:Number(document.getElementById("startFrame").value),
			endFrame:Number(document.getElementById("endFrame").value),
			offset:{x:Number(document.getElementById("offsetX").value),y:Number(document.getElementById("offsetY").value)},
			loop:document.getElementById("loopAnimationPreview").checked
			});
		
		this.assets_sprites_animation_control("stop");
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION ADD



//ASSETS SPRITES ANIMATION CONTROL
//Controls the animation preview of a sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_control = function(whichState){
	document.getElementById("playspriteSheetAnimation").style.backgroundPosition = "-70px -384px";
	document.getElementById("stopspriteSheetAnimation").style.backgroundPosition = "-70px -416px";
	switch(whichState){
		case "play":
			document.getElementById("playspriteSheetAnimation").style.backgroundPosition = "-102px -384px";
			this.animationPreviewState = "play";
			this.assets_sprites_animation_draw();
			break;
		case "stop":
			document.getElementById("stopspriteSheetAnimation").style.backgroundPosition = "-102px -416px";
			this.animationPreviewState = "stop";
			clearInterval(PE.animationPreview);
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION CONTROL



//ASSETS SPRITES ANIMATION DRAW
//Sets up a draw interval to preview the animation of a sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_draw = function(){
	if(this.animationPreview != null){
		clearInterval(PE.animationPreview);
	}
	var selectedIndex = document.getElementById("spriteSheetList").selectedIndex;
	var TS = FLAG.Scene.spriteSheets[selectedIndex];
	var startFrame = Number(document.getElementById("startFrame").value);
	if(startFrame < 0){
		startFrame = 0;
		document.getElementById("startFrame").value = 0;
	}
	var endFrame = Number(document.getElementById("endFrame").value);
	if(endFrame > TS.tileRects.length-1){
		endFrame = TS.tileRects.length-1;
		document.getElementById("endFrame").value = TS.tileRects.length-1;
	}else if(endFrame < 0){
		endFrame = 0;
		document.getElementById("endFrame").value = 0;
	}
	
	var imageIndex = POLE.spriteSheets[selectedIndex].image;
	document.getElementById("animationPreview").innerHTML = "";
	var tileWidth = POLE.spriteSheets[selectedIndex].tileDimensions.w;
	var tileHeight = POLE.spriteSheets[selectedIndex].tileDimensions.h;
	document.getElementById("animationPreview").innerHTML = '<canvas class="sheetImage" id="animationPreviewImage" width='+tileWidth+' height='+tileHeight+'></canvas>';	
	var c=document.getElementById("animationPreviewImage");
	var ctx=c.getContext("2d");
	ctx.clearRect(0, 0, tileWidth,tileHeight);
	var point = {x:0, y:0};
	var frame = startFrame;
	var rect = TS.tileRects[frame];
	try{
		ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
	}
	catch(err){};
	
	if(rect.w < 260){
		var marginLeft = Math.floor((260 - rect.w)/2);
		document.getElementById("animationPreviewImage").style.marginLeft = marginLeft.toString() + "px";
	}
	if(rect.h < 200){
		var marginTop = Math.floor((200 - rect.h)/2);
		document.getElementById("animationPreviewImage").style.marginTop = marginTop.toString() + "px";
	}
	
	
	this.animationPreview = setInterval(function(){
		if(PE.animationPreviewState == "play"){
			ctx.clearRect(0, 0, tileWidth,tileHeight);
			if(frame < endFrame){
				frame += 1;
			}else if(frame == endFrame){
				if(document.getElementById("loopAnimationPreview").checked == true){
					frame = startFrame;
				}else{
					PE.assets_sprites_animation_control("stop");
				}
			}
			rect = TS.tileRects[frame];
			try{
				ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
			}
			catch(err){};
		}
		
	},1000/15);
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION DRAW



//ASSETS SPRITES ANIMATION EDIT
//Edits an animation of a sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_edit = function(){
	var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
	var numAnimations = POLE.spriteSheets[spriteSheetIndex].animations.length;
	var animationIndex = -1;
	for(var i=0;i<numAnimations;i++){
		if(document.getElementById("dSAniList_"+i).className == "button_selected"){
			animationIndex = i;
		}
	}	
	
	if(animationIndex != -1){
		if(document.getElementById("animationName").value != "" && 
			document.getElementById("startFrame").value != "" &&
			document.getElementById("endFrame").value != "" &&
			document.getElementById("offsetX").value != "" &&
			document.getElementById("offsetY").value != ""){
			
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].name =	document.getElementById("animationName").value;
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].startFrame = Number(document.getElementById("startFrame").value);
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].endFrame = Number(document.getElementById("endFrame").value);
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].offset.x = Number(document.getElementById("offsetX").value);
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].offset.y = Number(document.getElementById("offsetY").value);
			POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].loop = document.getElementById("loopAnimationPreview").checked;
		
			this.assets_sprites_animation_control("stop");
		
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		}
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION EDIT



//ASSETS SPRITES ANIMATION FILL LIST
//Fills the list of sprite animations
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_fillList = function(){
	var html = "";
	var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
	if(spriteSheetIndex != -1){
		var numAnimations = POLE.spriteSheets[spriteSheetIndex].animations.length;
		for(var i=0;i<numAnimations;i++){
			html += '<input type="button" class="button_unselected" id="dSAniList_'+i+'" onclick="PE.assets_sprites_animation_select(this)" ondblclick="PE.menus_popUps(\'editSpriteSheetAnimation\');" value="'+POLE.spriteSheets[spriteSheetIndex].animations[i].name+'">';
		}
		document.getElementById("spriteSheetAnimationsList").innerHTML = html;		
	}else{
		document.getElementById("spriteSheetAnimationsList").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION FILL LIST



//ASSETS SPRITES ANIMATION REMOVE
//Removes an animation of a sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_remove = function(){
	var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
	var numAnimations = POLE.spriteSheets[spriteSheetIndex].animations.length;
	var animationIndex = -1;
	var animationsToKeep = [];
	for(var i=0;i<numAnimations;i++){
		if(document.getElementById("dSAniList_"+i).className == "button_unselected"){
			animationsToKeep.push(POLE.spriteSheets[spriteSheetIndex].animations[i]);
		}else{
			animationIndex = i;
		}
	}	
	
	if(animationIndex != -1){
		this.undo_create();
		POLE.spriteSheets[spriteSheetIndex].animations = animationsToKeep;
		animationsToKeep = [];
	
		//set any sprites that used the spriteSheet animation removed to null
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numSprites = POLE.scenes[s].sprites.length;
			for(var d=0;d<numSprites;d++){
				if(POLE.scenes[s].sprites[d].animation != animationIndex){
					//change any animation that is higher than the animation removed to one less
					if(POLE.scenes[s].sprites[d].animation > animationIndex){
						POLE.scenes[s].sprites[d].animation -= 1;
					}
				}else{
					POLE.scenes[s].sprites[d].animation = null;
					POLE.scenes[s].sprites[d].frame = 0;
				}
			}
		}
		
		//remove the spriteSheet animation reference from any actor bodies that might be using it
		var numActors = POLE.actors.length;
		for(var a=0;a<numActors;a++){
			var numBodies = POLE.actors[a].bodies.length;
			for(var b=0;b<numBodies;b++){
				if(POLE.actors[a].bodies[b].animation == animationIndex){
					POLE.actors[a].bodies[b].animation = null;
					POLE.actors[a].bodies[b].frame = 0;
				//reduce any animation that is higher than the one removed by one	
				}else if(POLE.actors[a].bodies[b].animation > animationIndex){
					POLE.actors[a].bodies[b].animation -= 1;
				}	
			}	
		}
	
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION REMOVE



//ASSETS SPRITES ANIMATION SELECT
//Select an animation from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_animation_select = function(which){
	var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
	var numAnimations = POLE.spriteSheets[spriteSheetIndex].animations.length;
	for(var i=0;i<numAnimations;i++){
		document.getElementById("dSAniList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var animationNum = which.id.slice(10);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editTileSheetAnimation"){
		document.getElementById("animationName").value = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].name;
		document.getElementById("startFrame").value = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].startFrame;
		document.getElementById("endFrame").value = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].endFrame;
		document.getElementById("offsetX").value = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].offset.x;
		document.getElementById("offsetY").value = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].offset.y;
		document.getElementById("loopAnimationPreview").checked = POLE.spriteSheets[spriteSheetIndex].animations[Number(animationNum)].loop;
		
		this.assets_sprites_animation_control("play");
		this.assets_sprites_animation_draw();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES ANIMATION SELECT



//ASSETS SPRITES SPRITE SHEETS ADD
//Adds a sprite sheet to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_spriteSheets_add = function(){
	if(document.getElementById("spriteSheetName").value != "" && document.getElementById("imageSelect").selectedIndex != -1){
		this.undo_create();
		POLE.spriteSheets.push({
			name:document.getElementById("spriteSheetName").value,
			image:Number(document.getElementById("imageSelect").selectedIndex),
			tileDimensions:{w:Number(document.getElementById("tileSheet_tile_Width").value),h:Number(document.getElementById("tileSheet_tile_Height").value)},
			numTiles:{w:Number(document.getElementById("tileSheet_numHorizontal").value),h:Number(document.getElementById("tileSheet_numVertical").value)},
			origin:{x:Number(document.getElementById("tileSheet_originX").value),y:Number(document.getElementById("tileSheet_originY").value)},
			offset:{x:Number(document.getElementById("tileSheet_offsetX").value),y:Number(document.getElementById("tileSheet_offsetY").value)},
			animations:[]
			});
			
		var numspriteSheets = POLE.spriteSheets.length;
		this.spriteSheetSelected = numspriteSheets - 1;
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES SPRITE SHEETS ADD



//ASSETS SPRITES SPRITE SHEETS COPY
//Makes a copy of a sprite sheet in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_spriteSheets_copy = function(){
	var selectedIndex = document.getElementById("spriteSheetList").selectedIndex;
	if(selectedIndex != -1){
		this.undo_create();
		var animations = [];
		var numAnimations = POLE.spriteSheets[selectedIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			animations.push({
				name:POLE.spriteSheets[selectedIndex].animations[a].name,
           		startFrame:POLE.spriteSheets[selectedIndex].animations[a].startFrame,
            	endFrame:POLE.spriteSheets[selectedIndex].animations[a].endFrame,
            	offset:{x:POLE.spriteSheets[selectedIndex].animations[a].offset.x,y:POLE.spriteSheets[selectedIndex].animations[a].offset.y},
            	loop:POLE.spriteSheets[selectedIndex].animations[a].loop				
			});
		}
		POLE.spriteSheets.push({
			name:POLE.spriteSheets[selectedIndex].name+"_copy",
			image:Number(POLE.spriteSheets[selectedIndex].image),
			tileDimensions:{w:Number(POLE.spriteSheets[selectedIndex].tileDimensions.w),h:Number(POLE.spriteSheets[selectedIndex].tileDimensions.h)},
			numTiles:{w:Number(POLE.spriteSheets[selectedIndex].numTiles.w),h:Number(POLE.spriteSheets[selectedIndex].numTiles.h)},
			origin:{x:Number(POLE.spriteSheets[selectedIndex].origin.x),y:Number(POLE.spriteSheets[selectedIndex].origin.y)},
			offset:{x:Number(POLE.spriteSheets[selectedIndex].offset.x),y:Number(POLE.spriteSheets[selectedIndex].offset.y)},
			animations:animations
		});
		
		var numSpriteSheets = POLE.spriteSheets.length;
		this.spriteSheetSelected = numSpriteSheets-1;
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";	
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES SPRITE SHEETS COPY



//ASSETS SPRITES SPRITE SHEETS EDIT
//Edit a sprite sheet in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_spriteSheets_edit = function(){
	var spriteSheetIndex = -1;
	if(document.getElementById("spriteSheetName").value != "" && document.getElementById("spriteSheetList").selectedIndex != -1){
		this.undo_create();
		spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].name = document.getElementById("spriteSheetName").value;
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].image = Number(document.getElementById("imageSelect").selectedIndex);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].tileDimensions.w = Number(document.getElementById("tileSheet_tile_Width").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].tileDimensions.h = Number(document.getElementById("tileSheet_tile_Height").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].numTiles.w = Number(document.getElementById("tileSheet_numHorizontal").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].numTiles.h = Number(document.getElementById("tileSheet_numVertical").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].origin.x = Number(document.getElementById("tileSheet_originX").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].origin.y = Number(document.getElementById("tileSheet_originY").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].offset.x = Number(document.getElementById("tileSheet_offsetX").value);
		POLE.spriteSheets[document.getElementById("spriteSheetList").selectedIndex].offset.y = Number(document.getElementById("tileSheet_offsetY").value);
	}
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES SPRITE SHEETS EDIT



//ASSETS SPRITES SPRITE SHEETS REMOVE
//Remove a sprite sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_spriteSheets_remove = function(){
	var selectedIndex = document.getElementById("spriteSheetList").selectedIndex;
	if(selectedIndex != -1){
		this.undo_create();
		var numspriteSheets = POLE.spriteSheets.length;
		var spriteSheetsToKeep = [];
		for(var i=0;i<numspriteSheets;i++){
			if(i != document.getElementById("spriteSheetList").selectedIndex){
				spriteSheetsToKeep.push(POLE.spriteSheets[i]);
			}
		}
		POLE.spriteSheets = spriteSheetsToKeep;
	
		//remove any sprites that used the spriteSheet removed
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numSprites = POLE.scenes[s].sprites.length;
			var spritesToKeep = [];
			for(var d=0;d<numSprites;d++){
				if(POLE.scenes[s].sprites[d].pIndex != selectedIndex){
					//change any spriteSheet that are higher than the spriteSheet removed to one less
					if(POLE.scenes[s].sprites[d].pIndex > selectedIndex){
						POLE.scenes[s].sprites[d].pIndex -= 1;
					}
					spritesToKeep.push(POLE.scenes[s].sprites[d]);
				}
			}
			POLE.scenes[s].sprites = spritesToKeep;
			spritesToKeep = [];
		}
		
		//remove the spriteSheet reference from any actor bodies that might be using it
		var numActors = POLE.actors.length;
		for(var a=0;a<numActors;a++){
			var numBodies = POLE.actors[a].bodies.length;
			for(var b=0;b<numBodies;b++){
				if(POLE.actors[a].bodies[b].spriteSheet == selectedIndex){
					POLE.actors[a].bodies[b].spriteSheet = null;
					POLE.actors[a].bodies[b].animation = null;
					POLE.actors[a].bodies[b].frame = null;
				//if spriteSheet is higher than the one removed reduce by one
				}else if(POLE.actors[a].bodies[b].spriteSheet > selectedIndex){
					POLE.actors[a].bodies[b].spriteSheet -= 1;
				}
			}	
		}
		
		var numspriteSheets = POLE.spriteSheets.length;
		this.spriteSheetSelected = numspriteSheets - 1;			
	
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES SPRITE SHEETS REMOVE



//ASSETS SPRITES SPRITE SHEETS SELECT
//Selects a sprite sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_sprites_spriteSheets_select = function(){
	this.spriteSheetSelected = document.getElementById("spriteSheetList").selectedIndex;
	this.assets_sprites_animation_fillList();
	this.tools_select(document.getElementById("tool_addSprite"));
}
//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES SPRITE SHEETS SELECT

//----------------------------------------------------------------------------------------------
//END ASSETS SPRITES



//ASSETS TILES
//----------------------------------------------------------------------------------------------

//ASSETS TILES FILL LIST
//Fills the list of tiles with pictures of tiles from the selected tile sheet
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_fillList = function(){
	var html = "";
	var tileSheetIndex = document.getElementById("tileSheetList").selectedIndex;
	if(tileSheetIndex != -1){
		this.tileSelected.sheetNum = tileSheetIndex;
		var numTiles = FLAG.Scene.tileSheets[tileSheetIndex].tilesWide * FLAG.Scene.tileSheets[tileSheetIndex].tilesHigh;
		for(var i=0;i<numTiles;i++){
			if(i==0){
				html += '<div class="tileSelector" id="tileList_'+(i+1)+'"><button class="tileButton_selected" id="tileBut_'+(i+1)+'" onclick="PE.assets_tiles_select(this,'+(i+1)+')"></button></div>';
				this.tileSelected.tileNum = i+1;
			}else{
				html += '<div class="tileSelector" id="tileList_'+(i+1)+'"><button class="tileButton_unselected" id="tileBut_'+(i+1)+'" onclick="PE.assets_tiles_select(this,'+(i+1)+')"></button></div>';
			}
		}
		document.getElementById("tileList").innerHTML = html;		
	
		var scaleFactor = this.tileSize;
		for(var i=0;i<numTiles;i++){
			document.getElementById("tileList_"+(i+1).toString()).style.backgroundImage = "url("+FLAG.Scene.tileSheets[tileSheetIndex].image.src.toString()+")";
			var x = FLAG.Scene.tileSheets[tileSheetIndex].tileRects[i+1].x * scaleFactor;
			var y = FLAG.Scene.tileSheets[tileSheetIndex].tileRects[i+1].y * scaleFactor;
			document.getElementById("tileList_"+(i+1).toString()).style.backgroundPosition = "-" +  x.toString() + "px -" +  y.toString() + "px";		
			document.getElementById("tileList_"+(i+1).toString()).style.width = (FLAG.Scene.tileSheets[tileSheetIndex].tileWidth*scaleFactor).toString()  + "px";
			document.getElementById("tileList_"+(i+1).toString()).style.height = (FLAG.Scene.tileSheets[tileSheetIndex].tileHeight*scaleFactor).toString()  + "px";
			document.getElementById("tileList_"+(i+1).toString()).style.backgroundSize = (FLAG.Scene.tileSheets[tileSheetIndex].image.width*scaleFactor).toString()  + "px " + (FLAG.Scene.tileSheets[tileSheetIndex].image.height*scaleFactor).toString()  +"px";
		}
	}else{
		document.getElementById("tileList").innerHTML = html;
		this.tileSelected.tileNum = -1;
		this.tileSelected.sheetNum = -1;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES FILL LIST



//ASSETS TILES SCALE
//Adjust the scale of the tile list display
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_scale = function(which){
	document.getElementById("tileScale_3").className = "tileScale_unselected";
	document.getElementById("tileScale_2").className = "tileScale_unselected";
	document.getElementById("tileScale_1").className = "tileScale_unselected";
	document.getElementById("tileScale_5").className = "tileScale_unselected";
	document.getElementById("tileScale_25").className = "tileScale_unselected";
	
	switch(which.id){
			case "tileScale_3":
				this.tileSize = 3;
				break;
			case "tileScale_2":
				this.tileSize = 2;
				break;
			case "tileScale_1":
				this.tileSize = 1;
				break;
			case "tileScale_5":
				this.tileSize = .5;
				break
			case "tileScale_25":
				this.tileSize = .25;
				break;
	}
	document.getElementById(which.id).className = "tileScale_selected";
	this.assets_tiles_fillList();
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES SCALE



//ASSETS TILES SELECT
//Selects a tile from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_select = function(which,num){
	this.tileSelected.tileNum = num;
	var numTiles = FLAG.Scene.tileSheets[this.tileSelected.sheetNum].tilesWide * FLAG.Scene.tileSheets[this.tileSelected.sheetNum].tilesHigh;
	for(var i=0;i<numTiles;i++){
		document.getElementById("tileBut_"+(i+1)).className = "tileButton_unselected";
	}
	document.getElementById(which.id).className = "tileButton_selected";
	
	this.tools_select(document.getElementById("tool_draw"));
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES SELECT



//ASSETS TILES TILE SHEETS ADD
//Adds a tile sheet to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSheets_add = function(){
	if(document.getElementById("tileSheetName").value != "" && document.getElementById("imageSelect").selectedIndex != -1){
		this.undo_create();
		POLE.tileSheets.push({
			name:document.getElementById("tileSheetName").value,
			image:Number(document.getElementById("imageSelect").selectedIndex),
			tileDimensions:{w:Number(document.getElementById("tileSheet_tile_Width").value),h:Number(document.getElementById("tileSheet_tile_Height").value)},
			numTiles:{w:Number(document.getElementById("tileSheet_numHorizontal").value),h:Number(document.getElementById("tileSheet_numVertical").value)},
			origin:{x:Number(document.getElementById("tileSheet_originX").value),y:Number(document.getElementById("tileSheet_originY").value)},
			animations:[]
			});
		
		this.tileSelected.sheetNum = POLE.tileSheets.length-1;
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SHEETS ADD



//ASSETS TILES TILE SHEETS EDIT
//Edits a tile sheet in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSheets_edit = function(){
	var tileSheetIndex = -1;
	if(document.getElementById("tileSheetName").value != "" && document.getElementById("tileSheetList").selectedIndex != -1){
		this.undo_create();
		tileSheetIndex = document.getElementById("tileSheetList").selectedIndex;
		
		//if the number of tiles has got smaller
		//need to remove those tiles for the tileIDs and tile sprites
		var oldNumTiles = POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.w * POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.h;
		var newNumTiles = Number(document.getElementById("tileSheet_numHorizontal").value) * Number(document.getElementById("tileSheet_numVertical").value);
		if(newNumTiles < oldNumTiles){
			
			//tileSheet animations
			var numAnimations = POLE.tileSheets[tileSheetIndex].animations.length;
			var animationsToKeep = [];
			for(var a=0;a<numAnimations;a++){
				if(POLE.tileSheets[tileSheetIndex].animations[a].startFrame <= newNumTiles && POLE.tileSheets[tileSheetIndex].animations[a].endFrame <= newNumTiles){
					animationsToKeep.push(POLE.tileSheets[tileSheetIndex].animations[a]);
				}
			}
			POLE.tileSheets[tileSheetIndex].animations = animationsToKeep;
			animationsToKeep = [];
		
			var numScenes = POLE.scenes.length;
			for(var s=0;s<numScenes;s++){				
				
				//tileSprites - in scenes
				var numTileSprites = POLE.scenes[s].tileSprites.length;
				var tileSpritesToKeep = [];
				for(var ts=0;ts<numTileSprites;ts++){
					if(POLE.scenes[s].tileSprites[ts].startFrame <= newNumTiles && POLE.scenes[s].tileSprites[ts].endFrame <= newNumTiles){
						tileSpritesToKeep.push(POLE.scenes[s].tileSprites[ts]);
					}
				}
				POLE.scenes[s].tileSprites = tileSpritesToKeep;
				tileSpritesToKeep = [];
			
				//tiles
				var numLayers = POLE.scenes[s].layers.length;
				for(var l=0;l<numLayers;l++){	
					for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
						for(var c=0;c<POLE.scenes[s].tilesWide;c++){
							if(POLE.scenes[s].layers[l].tileSheetIDs[r][c] == tileSheetIndex && POLE.scenes[s].layers[l].tileIDs[r][c] > newNumTiles){
								POLE.scenes[s].layers[l].tileSheetIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileIDs[r][c] = 0;
							}
						}
					}
				}	
			}
		}

		
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].name = document.getElementById("tileSheetName").value;
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].image = Number(document.getElementById("imageSelect").selectedIndex);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].tileDimensions.w = Number(document.getElementById("tileSheet_tile_Width").value);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].tileDimensions.h = Number(document.getElementById("tileSheet_tile_Height").value);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.w = Number(document.getElementById("tileSheet_numHorizontal").value);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].numTiles.h = Number(document.getElementById("tileSheet_numVertical").value);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].origin.x = Number(document.getElementById("tileSheet_originX").value);
		POLE.tileSheets[document.getElementById("tileSheetList").selectedIndex].origin.y = Number(document.getElementById("tileSheet_originY").value);
		
		
	}
	
	this.tileSelected.sheetNum = tileSheetIndex;
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SHEETS EDIT



//ASSETS TILES TILE SHEETS REMOVE
//Removes a tile sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSheets_remove = function(){
	var selectedIndex = document.getElementById("tileSheetList").selectedIndex;
	if(selectedIndex != -1){
		this.undo_create();
		var numTileSheets = POLE.tileSheets.length;
		var tileSheetsToKeep = [];
		for(var i=0;i<numTileSheets;i++){
			if(i != document.getElementById("tileSheetList").selectedIndex){
				tileSheetsToKeep.push(POLE.tileSheets[i]);
			}
		}
		POLE.tileSheets = tileSheetsToKeep;
	
		//remove all references of removed tile sheet from tileIDs and tileSheetIDs from all scenes
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numLayers = POLE.scenes[s].layers.length;
			for(var l=0;l<numLayers;l++){
				for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
					for(var c=0;c<POLE.scenes[s].tilesWide;c++){
						if(POLE.scenes[s].layers[l].tileSheetIDs[r][c] == selectedIndex){
							POLE.scenes[s].layers[l].tileSheetIDs[r][c] = 0;
							POLE.scenes[s].layers[l].tileIDs[r][c] = 0;
						//change any tileSheetIDs that are higher than the tileSheet removed to one less
						}else if(POLE.scenes[s].layers[l].tileSheetIDs[r][c] > selectedIndex){
							POLE.scenes[s].layers[l].tileSheetIDs[r][c] -= 1;
						}
					}
				}	
			}
		}
		this.tileSelected.sheetNum = selectedIndex-1;
	
		//remove any tileSprites that used the tileSheet removed
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numTileSprites = POLE.scenes[s].tileSprites.length;
			var tileSpritesToKeep = [];
			for(var ts=0;ts<numTileSprites;ts++){
				if(POLE.scenes[s].tileSprites[ts].pIndex != selectedIndex){
					//change any tileSheet that are higher than the tileSheet removed to one less
					if(POLE.scenes[s].tileSprites[ts].pIndex > selectedIndex){
						POLE.scenes[s].tileSprites[ts].pIndex -= 1;
					}
					tileSpritesToKeep.push(POLE.scenes[s].tileSprites[ts]);
				}
			}
			POLE.scenes[s].tileSprites = tileSpritesToKeep;
			tileSpritesToKeep = [];
		}		
	
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SHEETS REMOVE



//ASSETS TILES TILE SHEETS SELECT
//Selects a tile sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSheets_select = function(){
	this.assets_tiles_fillList();
	this.assets_tiles_tileSprites_fillList();
	//if edit window is open
	if(document.getElementById("popUp").className == "editTileSheet"){
		if(document.getElementById("tileSheetList").selectedIndex != -1){
			PE.menus_popUps('editTileSheet');
		}
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SHEETS SELECT



//ASSETS TILES TILE SPRITES ADD
//Adds a tile sprite to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_add = function(){
	if(document.getElementById("animationName").value != "" && 
		document.getElementById("startFrame").value != "" &&
		document.getElementById("endFrame").value != ""){
		this.undo_create();
		POLE.tileSheets[this.tileSelected.sheetNum].animations.push({
			name:document.getElementById("animationName").value,
			startFrame:Number(document.getElementById("startFrame").value),
			endFrame:Number(document.getElementById("endFrame").value),
			loop:document.getElementById("loopAnimationPreview").checked
			});
		
		this.assets_tiles_tileSprites_animation_control("stop");
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES ADD



//ASSETS TILES TILE SPRITES ANIMATION CONTROL
//Controls the preview animation of a tile sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_animation_control = function(whichState){
	document.getElementById("playActorSheetAnimation").style.backgroundPosition = "-70px -384px";
	document.getElementById("stopActorSheetAnimation").style.backgroundPosition = "-70px -416px";
	switch(whichState){
		case "play":
			document.getElementById("playActorSheetAnimation").style.backgroundPosition = "-102px -384px";
			this.animationPreviewState = "play";
			this.assets_tiles_tileSprites_animation_draw();
			break;
		case "stop":
			document.getElementById("stopActorSheetAnimation").style.backgroundPosition = "-102px -416px";
			this.animationPreviewState = "stop";
			clearInterval(PE.animationPreview);
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES ANIMATION CONTROL



//ASSETS TILES TILE SPRITES ANIMATION DRAW
//Sets up a draw interval to preview the animation of a tile sprite
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_animation_draw = function(){
	if(this.animationPreview != null){
		clearInterval(this.animationPreview);
	}
	var TS = FLAG.Scene.tileSheets[this.tileSelected.sheetNum];
	var startFrame = Number(document.getElementById("startFrame").value);
	if(startFrame < 1){
		startFrame = 1;
		document.getElementById("startFrame").value = 1;
	}
	var endFrame = Number(document.getElementById("endFrame").value);
	if(endFrame > TS.tileRects.length-1){
		endFrame = TS.tileRects.length-1;
		document.getElementById("endFrame").value = TS.tileRects.length-1;
	}else if(endFrame < 1){
		endFrame = 1;
		document.getElementById("endFrame").value = 1;
	}
	
	
	var imageIndex = POLE.tileSheets[this.tileSelected.sheetNum].image;
	document.getElementById("animationPreview").innerHTML = "";
	var tileWidth = POLE.tileSheets[this.tileSelected.sheetNum].tileDimensions.w;
	var tileHeight = POLE.tileSheets[this.tileSelected.sheetNum].tileDimensions.h;
	document.getElementById("animationPreview").innerHTML = '<canvas class="sheetImage" id="animationPreviewImage" width='+tileWidth+' height='+tileHeight+'></canvas>';	
	var c=document.getElementById("animationPreviewImage");
	var ctx=c.getContext("2d");
	ctx.clearRect(0, 0, tileWidth,tileHeight);
	var point = {x:0, y:0};
	var frame = startFrame;
	var rect = TS.tileRects[frame];
	try{
		ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
	}
	catch(err){};
	
	if(rect.w < 260){
		var marginLeft = Math.floor((260 - rect.w)/2);
		document.getElementById("animationPreviewImage").style.marginLeft = marginLeft.toString() + "px";
	}
	if(rect.h < 200){
		var marginTop = Math.floor((200 - rect.h)/2);
		document.getElementById("animationPreviewImage").style.marginTop = marginTop.toString() + "px";
	}
	
	
	this.animationPreview = setInterval(function(){
		if(PE.animationPreviewState == "play"){
			ctx.clearRect(0, 0, tileWidth,tileHeight);
			if(frame < endFrame){
				frame += 1;
			}else if(frame == endFrame){
				if(document.getElementById("loopAnimationPreview").checked == true){
					frame = startFrame;
				}else{
					PE.assets_tiles_tileSprites_animation_control("stop");
				}
			}
			rect = TS.tileRects[frame];
			try{
				ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
			}
			catch(err){};
		}
		
	},1000/15);
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES ANIMATION DRAW



//ASSETS TILES TILE SPRITES EDIT
//Edit a tile sprite in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_edit = function(){
	if(document.getElementById("animationName").value != "" && 
		document.getElementById("startFrame").value != "" &&
		document.getElementById("endFrame").value != ""){
		this.undo_create();
		POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].name =	document.getElementById("animationName").value;
		POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].startFrame = Number(document.getElementById("startFrame").value);
		POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].endFrame = Number(document.getElementById("endFrame").value);
		POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].loop = document.getElementById("loopAnimationPreview").checked;
		
		this.assets_tiles_tileSprites_animation_control("stop");
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES EDIT



//ASSETS TILES TILE SPRITES FILL LIST
//Fills the list of tile sprites
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_fillList = function(){
	var html = "";
	var tileSheetIndex = document.getElementById("tileSheetList").selectedIndex;
	if(tileSheetIndex != -1){
		this.tileSelected.sheetNum = tileSheetIndex;
		var numAnimations = POLE.tileSheets[tileSheetIndex].animations.length;
		for(var i=0;i<numAnimations;i++){
			html += '<input type="button" class="button_unselected" id="tSAniList_'+i+'" onclick="PE.assets_tiles_tileSprites_select(this)" ondblclick="PE.menus_popUps(\'editTileSheetAnimation\');" value="'+POLE.tileSheets[tileSheetIndex].animations[i].name+'">';
		}
		document.getElementById("tileSheetAnimationsList").innerHTML = html;		
	}else{
		document.getElementById("tileSheetAnimationsList").innerHTML = html;
	}
	this.tileAnimationSelected = -1;
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES FILL LIST



//ASSETS TILES TILE SPRITES REMOVE
//Removes a tile sprite from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_remove = function(){
	var numAnimations = POLE.tileSheets[this.tileSelected.sheetNum].animations.length;
	var animationIndex = -1;
	var animationsToKeep = [];
	for(var i=0;i<numAnimations;i++){
		if(document.getElementById("tSAniList_"+i).className == "button_unselected"){
			animationsToKeep.push(POLE.tileSheets[this.tileSelected.sheetNum].animations[i]);
		}else{
			animationIndex = i;
		}
	}	
	
	if(animationIndex != -1){
		this.undo_create();
		POLE.tileSheets[this.tileSelected.sheetNum].animations = animationsToKeep;
		animationsToKeep = [];
	
		//remove any tileSprites that used the tileSheet animation removed
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			var numTileSprites = POLE.scenes[s].tileSprites.length;
			var tileSpritesToKeep = [];
			for(var ts=0;ts<numTileSprites;ts++){
				if(POLE.scenes[s].tileSprites[ts].animation != animationIndex){
					//change any animation that is higher than the animation removed to one less
					if(POLE.scenes[s].tileSprites[ts].animation > animationIndex){
						POLE.scenes[s].tileSprites[ts].animation -= 1;
					}
					tileSpritesToKeep.push(POLE.scenes[s].tileSprites[ts]);
				}
			}
			POLE.scenes[s].tileSprites = tileSpritesToKeep;
			tileSpritesToKeep = [];
		}
	
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES REMOVE



//ASSETS TILES TILE SPRITES SELECT
//Selects a tile sprite from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tileSprites_select = function(which){
	var numAnimations = POLE.tileSheets[this.tileSelected.sheetNum].animations.length;
	for(var i=0;i<numAnimations;i++){
		document.getElementById("tSAniList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var animationNum = which.id.slice(10);
	this.tileAnimationSelected = Number(animationNum);
	
	this.tools_select(document.getElementById("tool_drawTileSprites"));
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editTileSheetAnimation"){
		document.getElementById("animationName").value = POLE.tileSheets[this.tileSelected.sheetNum].animations[Number(animationNum)].name;
		document.getElementById("startFrame").value = POLE.tileSheets[this.tileSelected.sheetNum].animations[Number(animationNum)].startFrame;
		document.getElementById("endFrame").value = POLE.tileSheets[this.tileSelected.sheetNum].animations[Number(animationNum)].endFrame;
		document.getElementById("loopAnimationPreview").checked = POLE.tileSheets[this.tileSelected.sheetNum].animations[Number(animationNum)].loop;
		
		this.assets_tiles_tileSprites_animation_control("play");
		this.assets_tiles_tileSprites_animation_draw();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILE SPRITES SELECT



//ASSETS TILES TILED OBJECT SHEETS ADD
//Adds a tiled object sheet to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjectSheets_add = function(){
	if(document.getElementById("tiledObjectSheetName").value != "" && document.getElementById("imageSelect").selectedIndex != -1){
		this.undo_create();
		POLE.tiledObjectSheets.push({
			name:document.getElementById("tiledObjectSheetName").value,
			image:Number(document.getElementById("imageSelect").selectedIndex),
			tileDimensions:{w:Number(document.getElementById("tileSheet_tile_Width").value),h:Number(document.getElementById("tileSheet_tile_Height").value)},
			numTiles:{w:Number(document.getElementById("tileSheet_numHorizontal").value),h:Number(document.getElementById("tileSheet_numVertical").value)},
			origin:{x:Number(document.getElementById("tileSheet_originX").value),y:Number(document.getElementById("tileSheet_originY").value)},
			frameSize:{w:Number(document.getElementById("frameSizeW").value),h:Number(document.getElementById("frameSizeH").value)},
			numFrames:{w:Number(document.getElementById("numFramesW").value),h:Number(document.getElementById("numFramesH").value)},
			animations:[]
			});
			
		this.tiledObjectSheetSelected = POLE.tiledObjectSheets.length-1;
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECT SHEETS ADD



//ASSETS TILES TILED OBJECT SHEETS EDIT
//Edits a tiled object sheet in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjectSheets_edit = function(){
	if(document.getElementById("tiledObjectSheetName").value != "" && document.getElementById("imageSelect").selectedIndex != -1){
		this.undo_create();
		var selectedIndex = document.getElementById("tiledObjectSheetList").selectedIndex;
		POLE.tiledObjectSheets[selectedIndex].name = document.getElementById("tiledObjectSheetName").value;
		POLE.tiledObjectSheets[selectedIndex].image = Number(document.getElementById("imageSelect").selectedIndex);
		POLE.tiledObjectSheets[selectedIndex].tileDimensions.w = Number(document.getElementById("tileSheet_tile_Width").value);
		POLE.tiledObjectSheets[selectedIndex].tileDimensions.h = Number(document.getElementById("tileSheet_tile_Height").value);
		POLE.tiledObjectSheets[selectedIndex].numTiles.w = Number(document.getElementById("tileSheet_numHorizontal").value);
		POLE.tiledObjectSheets[selectedIndex].numTiles.h = Number(document.getElementById("tileSheet_numVertical").value);
		POLE.tiledObjectSheets[selectedIndex].origin.x = Number(document.getElementById("tileSheet_originX").value);
		POLE.tiledObjectSheets[selectedIndex].origin.y = Number(document.getElementById("tileSheet_originY").value);
		POLE.tiledObjectSheets[selectedIndex].frameSize.w = Number(document.getElementById("frameSizeW").value);
		POLE.tiledObjectSheets[selectedIndex].frameSize.h = Number(document.getElementById("frameSizeH").value);
		POLE.tiledObjectSheets[selectedIndex].numFrames.w = Number(document.getElementById("numFramesW").value);
		POLE.tiledObjectSheets[selectedIndex].numFrames.h = Number(document.getElementById("numFramesH").value);
		
		if(selectedIndex != -1){
			//remove all references of removed tile sheet from tileIDs and tileSheetIDs and tiledObjectIDs from all scenes
			var numScenes = POLE.scenes.length;
			for(var s=0;s<numScenes;s++){
				var numLayers = POLE.scenes[s].layers.length;
				for(var l=0;l<numLayers;l++){
					for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
						for(var c=0;c<POLE.scenes[s].tilesWide;c++){
							if(POLE.scenes[s].layers[l].tiledObjectIDs[r][c] == selectedIndex+1){
								POLE.scenes[s].layers[l].tiledObjectIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileSheetIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileIDs[r][c] = 0;
							}
						}
					}	
				}
			}
		}
		
		this.scene_reload();
		if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
			this.pole_update_display();
		}
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECT SHEETS EDIT



//ASSETS TILES TILED OBJECT SHEETS REMOVE
//Removes a tiled object sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjectSheets_remove = function(){
	var selectedIndex = document.getElementById("tiledObjectSheetList").selectedIndex;
	if(selectedIndex != -1){
		this.undo_create();
		var numTiledObjectSheets = POLE.tiledObjectSheets.length;
		var tiledObjectSheetsToKeep = [];
		for(var i=0;i<numTiledObjectSheets;i++){
			if(i != document.getElementById("tiledObjectSheetList").selectedIndex){
				tiledObjectSheetsToKeep.push(POLE.tiledObjectSheets[i]);
			}
		}
	
		//remove all references of removed tile sheet from tileIDs and tileSheetIDs and tiledObjectIDs from all scenes
		var numScenes = POLE.scenes.length;
		for(var s=0;s<numScenes;s++){
			
			var numLayers = POLE.scenes[s].layers.length;
			for(var l=0;l<numLayers;l++){
				for(var r=0;r<POLE.scenes[s].tilesHigh;r++){
					for(var c=0;c<POLE.scenes[s].tilesWide;c++){
						if(POLE.scenes[s].layers[l].tiledObjectIDs[r][c] > 0){
							if(POLE.scenes[s].tiledObjects[POLE.scenes[s].layers[l].tiledObjectIDs[r][c]-1].pIndex == selectedIndex){
								POLE.scenes[s].layers[l].tiledObjectIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileSheetIDs[r][c] = 0;
								POLE.scenes[s].layers[l].tileIDs[r][c] = 0;
							//change any pIndex higher the one removed to one less
							}else if(POLE.scenes[s].tiledObjects[POLE.scenes[s].layers[l].tiledObjectIDs[r][c]-1].pIndex > selectedIndex){
								POLE.scenes[s].layers[l].tiledObjectIDs[r][c] -= 1;
							}
						}
					}
				}	
			}
			
			//remove any tiledObjects that used the removed tiledObject Sheet
			var numTiledObjects = POLE.scenes[s].tiledObjects.length;
			var tiledObjectsToKeep = [];
			for(var i=0;i<numTiledObjects;i++){
				if(POLE.scenes[s].tiledObjects[i].pIndex != selectedIndex){
					//change any pIndex that is higher than the one removed to one less
					if(POLE.scenes[s].tiledObjects[i].pIndex > selectedIndex){
						POLE.scenes[s].tiledObjects[i].pIndex -= 1;
					}
					tiledObjectsToKeep.push(POLE.scenes[s].tiledObjects[i]);
				}
			}	
			POLE.scenes[s].tiledObjects = tiledObjectsToKeep;
			tiledObjectsToKeep = [];
		}
	
	
		POLE.tiledObjectSheets = tiledObjectSheetsToKeep;
		tiledObjectSheetsToKeep = [];
	
		if(POLE.tiledObjectSheets.length > 0){
			this.tiledObjectSheetSelected = POLE.tiledObjectSheets.length-1;
		}else{
			this.tiledObjectSheetSelected = -1;
		}
	
		this.scene_reload();
		if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
			this.pole_update_display();
		}
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECT SHEETS REMOVE



//ASSETS TILES TILED OBJECT SHEETS SELECT
//Selects a tiled object sheet from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjectSheets_select = function(){
	this.tiledObjectSheetSelected = document.getElementById("tiledObjectSheetList").selectedIndex;
	this.assets_tiles_tiledObjects_animation_fillList();
	this.tools_select(document.getElementById("tool_drawTiledObjects"));
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECT SHEETS SELECT



//ASSETS TILES TILED OBJECTS ANIMATION ADD
//Adds an animation to a tiled object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_add = function(){
	if(document.getElementById("animationName").value != "" && 
		document.getElementById("startFrame").value != "" &&
		document.getElementById("endFrame").value != ""){
		this.undo_create();
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations.push({
			name:document.getElementById("animationName").value,
			startFrame:Number(document.getElementById("startFrame").value),
			endFrame:Number(document.getElementById("endFrame").value),
			loop:document.getElementById("loopAnimationPreview").checked
			});
		
		this.assets_tiles_tiledObjects_animation_control("stop");
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION ADD



//ASSETS TILES TILED OBJECTS ANIMATION CONTROL
//Controls the animation preview of a tiled object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_control = function(whichState){
	document.getElementById("playActorSheetAnimation").style.backgroundPosition = "-70px -384px";
	document.getElementById("stopActorSheetAnimation").style.backgroundPosition = "-70px -416px";
	switch(whichState){
		case "play":
			document.getElementById("playActorSheetAnimation").style.backgroundPosition = "-102px -384px";
			this.animationPreviewState = "play";
			this.assets_tiles_tiledObjects_animation_draw();
			break;
		case "stop":
			document.getElementById("stopActorSheetAnimation").style.backgroundPosition = "-102px -416px";
			this.animationPreviewState = "stop";
			clearInterval(PE.animationPreview);
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION CONTROL



//ASSETS TILES TILED OBJECTS ANIMATION DRAW
//Sets up a draw interval to preview the animation of a tiled object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_draw = function(){
	if(this.animationPreview != null){
		clearInterval(PE.animationPreview);
	}
	var TS = FLAG.Scene.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex];
	var startFrame = Number(document.getElementById("startFrame").value);
	if(startFrame < 0){
		startFrame = 0;
		document.getElementById("startFrame").value = 0;
	}
	var endFrame = Number(document.getElementById("endFrame").value);
	if(endFrame > (TS.framesWide *TS.framesHigh)-1){
		endFrame = (TS.framesWide *TS.framesHigh)-1;
		document.getElementById("endFrame").value = (TS.framesWide *TS.framesHigh)-1;
	}else if(endFrame < 0){
		endFrame = 0;
		document.getElementById("endFrame").value = 0;
	}
	
	
	var imageIndex = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].image;
	document.getElementById("animationPreview").innerHTML = "";
	var tileWidth = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.w;
	var tileHeight = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.h;
	document.getElementById("animationPreview").innerHTML = '<canvas class="sheetImage" id="animationPreviewImage" width='+tileWidth+' height='+tileHeight+'></canvas>';	
	var c=document.getElementById("animationPreviewImage");
	var ctx=c.getContext("2d");
	ctx.clearRect(0, 0, tileWidth,tileHeight);
	var point = {x:0, y:0};
	var frame = startFrame;
	var rect = TS.tileRects[frame];
	
	var framesArray = new Array;
	for (var i = 0; i < POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numFrames.h; i++){
		for (var j = 0; j < POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].numFrames.w; j++){
			framesArray.push({x:(j*POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.w)+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].origin.x,y:(i*POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.h)+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].origin.y,w:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.w,h:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].frameSize.h});
		}
	}	
	var rect = framesArray[frame];
	
	try{
		ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
	}
	catch(err){};
	
	if(rect.w < 260){
		var marginLeft = Math.floor((260 - rect.w)/2);
		document.getElementById("animationPreviewImage").style.marginLeft = marginLeft.toString() + "px";
	}
	if(rect.h < 200){
		var marginTop = Math.floor((200 - rect.h)/2);
		document.getElementById("animationPreviewImage").style.marginTop = marginTop.toString() + "px";
	}
	
	
	this.animationPreview = setInterval(function(){
		if(PE.animationPreviewState == "play"){
			ctx.clearRect(0, 0, tileWidth,tileHeight);
			if(frame < endFrame){
				frame += 1;
			}else if(frame == endFrame){
				if(document.getElementById("loopAnimationPreview").checked == true){
					frame = startFrame;
				}else{
					PE.assets_tiles_tiledObjects_animation_control("stop");
				}
			}
			rect = framesArray[frame];
			try{
				ctx.drawImage(TS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
			}
			catch(err){};
		}
		
	},1000/15);
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION DRAW



//ASSETS TILES TILED OBJECTS ANIMATION EDIT
//Edits an animation of a tiled object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_edit = function(){
	if(document.getElementById("animationName").value != "" && 
		document.getElementById("startFrame").value != "" &&
		document.getElementById("endFrame").value != ""){
		this.undo_create();
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[this.tiledObjectSheetAnimationSelected].name = document.getElementById("animationName").value;
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[this.tiledObjectSheetAnimationSelected].startFrame = Number(document.getElementById("startFrame").value);
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[this.tiledObjectSheetAnimationSelected].endFrame = Number(document.getElementById("endFrame").value);
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[this.tiledObjectSheetAnimationSelected].loop = document.getElementById("loopAnimationPreview").checked;
		
		this.assets_tiles_tiledObjects_animation_control("stop");
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION EDIT



//ASSETS TILES TILED OBJECTS ANIMATION FILL LIST
//Fills the list of tiled object animations
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_fillList = function(){
	var html = "";
	if(document.getElementById("tiledObjectSheetList").selectedIndex != -1){
		var numAnimations = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations.length;
		for(var i=0;i<numAnimations;i++){
			html += '<input type="button" class="button_unselected" id="tOSAniList_'+i+'" onclick="PE.assets_tiles_tiledObjects_animation_select(this)" ondblclick="PE.menus_popUps(\'editTiledObjectSheetAnimation\');" value="'+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[i].name+'">';
		}
		document.getElementById("tiledObjectSheetAnimationsList").innerHTML = html;		
	}else{
		document.getElementById("tiledObjectSheetAnimationsList").innerHTML = html;
	}
	this.tiledObjectSheetAnimationSelected = -1;
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION FILL LIST



//ASSETS TILES TILED OBJECTS ANIMATION REMOVE
//Removes an animation from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_remove = function(){
	var numAnimations = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations.length;
	var animationsToKeep = [];
	var removedIndex = null;
	for(var i=0;i<numAnimations;i++){
		if(document.getElementById("tOSAniList_"+i).className == "button_unselected"){
			animationsToKeep.push(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[i]);
		}else{
			removedIndex = i;
		}
	}	
	
	//find any tiledObjects in scene that may contain the removed animation
	if(removedIndex != null){
		this.undo_create();
	 	var numScenes = POLE.scenes.length;
	 	for(var s=0;s<numScenes;s++){
	 		var numTiledObjects = POLE.scenes[s].tiledObjects.length;
	 		for(var t=0;t<numTiledObjects;t++){
	 			if(POLE.scenes[s].tiledObjects[t].animation == removedIndex && POLE.scenes[s].tiledObjects[t].pIndex == document.getElementById("tiledObjectSheetList").selectedIndex){
	 				POLE.scenes[s].tiledObjects[t].animation = null;
	 			//change any animation higher than the one removed to one less
	 			}else if(POLE.scenes[s].tiledObjects[t].animation != removedIndex && POLE.scenes[s].tiledObjects[t].pIndex == document.getElementById("tiledObjectSheetList").selectedIndex){
	 				if(POLE.scenes[s].tiledObjects[t].animation > removedIndex){
	 					POLE.scenes[s].tiledObjects[t].animation -= 1;
	 				}
	 			}
	 		}
	 	}
	
	
		POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations = animationsToKeep;
		animationsToKeep = [];
	
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION REMOVE



//ASSETS TILES TILED OBJECTS ANIMATION SELECT
//Selects an animation from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.assets_tiles_tiledObjects_animation_select = function(which){
	var numAnimations = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations.length;
	for(var i=0;i<numAnimations;i++){
		document.getElementById("tOSAniList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var animationNum = which.id.slice(11);
	this.tiledObjectSheetAnimationSelected = Number(animationNum);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editTiledObjectSheetAnimation"){
		document.getElementById("animationName").value = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[Number(animationNum)].name;
		document.getElementById("startFrame").value = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[Number(animationNum)].startFrame;
		document.getElementById("endFrame").value = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[Number(animationNum)].endFrame;
		document.getElementById("loopAnimationPreview").checked = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[Number(animationNum)].loop;
		
		this.assets_tiles_tiledObjects_animation_control("play");
		this.assets_tiles_tiledObjects_animation_draw();
	}
}
//----------------------------------------------------------------------------------------------
//END ASSETS TILES TILED OBJECTS ANIMATION SELECT

//----------------------------------------------------------------------------------------------
//END ASSETS TILES

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END ASSETS




//GAME
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//GAME DISPLAY BUFFERIING
//Toggles if the game uses a buffer for all the images
//When set to buffer, images are drawn to a buffer canvas and then rendered to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_display_buffering = function(){
	if(document.getElementById("imageBuffer").checked){
		POLE.display.imageBuffer = true;
	}else{
		POLE.display.imageBuffer = false;
	}
	this.pole_update_display();
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END GAME DISPLAY BUFFERIING



//GAME DISPLAY INTERPOLATION
//Toggles if the game uses anti-aliasing or not
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_display_interpolation = function(){
	if(document.getElementById("imageSmoothing").checked){
		FLAG.imageSmoothing(true);
		POLE.display.imageSmoothing = true;
	}else{
		FLAG.imageSmoothing(false);
		POLE.display.imageSmoothing = false;
	}
	this.pole_update_display();
}
//----------------------------------------------------------------------------------------------
//END GAME DISPLAY INTERPOLATION



//GAME DISPLAY RESOLUTION
//Edit the resolution of the game, the pixel dimensions of the game
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_display_resolution = function(){
	var width = Number(document.getElementById("resW").value);	
	var height = Number(document.getElementById("resH").value);
	
	this.undo_create();
	POLE.display.w = width;
	POLE.display.h = height;
	this.pole_update_display();
	FLAG.scaleGame();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
	document.getElementById('game_Width').innerHTML = POLE.display.w;
	document.getElementById('game_Height').innerHTML = POLE.display.h;
}
//----------------------------------------------------------------------------------------------
//END GAME DISPLAY RESOLUTION



//GAME FPS RAF
//Toggles if the game uses request animation frame for the draw call
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_fps_raf = function(){
	if(POLE.fps.useRAF == true){
		POLE.fps.useRAF = false;
	}else{
		POLE.fps.useRAF = true;
	}
	
	FLAG.pause();
	FLAG.FPS.useRAF = POLE.fps.useRAF;
	FLAG.FPS.set = POLE.fps.set;
	FLAG.FPS.sprites = POLE.fps.sprites;
	FLAG.play();
	
	this.pole_update_display();
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END GAME FPS RAF



//GAME FPS SET FPS
//When not using request animation frame, this sets an interval for a frames per second draw call
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_fps_setFPS = function(){
	if(document.getElementById("setFPSset").value != ""){
		POLE.fps.set = Number(document.getElementById("setFPSset").value);
		
		FLAG.pause();
		FLAG.FPS.set = POLE.fps.set;
		FLAG.play();
	
		this.pole_update_display();
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END GAME FPS SET FPS



//GAME FPS SET SPRITE FPS
//Sets the sprite frames per second draw call
//Sprites run on a separate interval so that they do not need as high of a frame rate as the game
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.game_fps_setSpriteFPS = function(){
	if(document.getElementById("spriteFPSset").value != ""){
		POLE.fps.sprites = Number(document.getElementById("spriteFPSset").value);
		
		FLAG.pause();
		FLAG.FPS.sprites = POLE.fps.sprites;
		FLAG.play();
	
		this.pole_update_display();
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END GAME FPS SET SPRITE FPS

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END GAME




//MENUS
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//MENUS CENTER POPUPS
//Keeps popup menus in the center of the screen
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_centerPopUps = function(){
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
//END MENUS CENTER POPUPS



//MENUS DROP DOWNS
//Controls for the drop down menus from the top bar
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_dropDowns = function(which){
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
//END MENUS DROP DOWNS



//MENUS INITIALIZE
//position menus in their initial state
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_init = function(){
	//throw menus to the right
	document.getElementById("menus").style.left=(window.innerWidth-300).toString()+"px";
	
	//check the right map type
	document.getElementById(POLE.scenes[this.sceneSelected].type).checked = true;
	this.menus_tabbed('assets');
	
	//reactivate scroll on submenus and pop ups
	/*
	document.getElementById("gameSettings").addEventListener('touchmove', function(e){e.stopPropagation();});
	document.getElementById("assets").addEventListener('touchmove', function(e){e.stopPropagation();});
	document.getElementById("scene").addEventListener('touchmove', function(e){e.stopPropagation();});
	document.getElementById("info").addEventListener('touchmove', function(e){e.stopPropagation();});
	document.getElementById("popUp").addEventListener('touchmove', function(e){e.stopPropagation();});
	*/
	
	this.pole_update_display();
}
//----------------------------------------------------------------------------------------------
//END MENUS INITIALIZE



//MENUS POPUPS
//Control the display of pop up menus
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_popUps = function(which){
	//event.preventDefault();
	this.animationPreviewState = "stop";
	if(this.animationPreview != null){
		clearInterval(PE.animationPreview);
		this.animationPreview = null;
	}
	this.screenShot = null;
	this.assets_sounds_preview_stop();
	document.getElementById("popUp").style.visibility = "hidden";
	
	//hide menu bar menus
	this.menus_dropDowns("none");	
	
	switch(which){
	
		//ASSETS
	
		//IMAGES
		//------------------------------------------------------------------
		case "addImage":
			var html = '<div id="popUpContent">';
			html += '<h2>Image Name:</h2>'
			html += '<input class="wideBox" type="text" name="imageName" id="imageName" value="">';
			html += '<h2>Image URL:</h2>'
			html += '<input class="wideBox" type="text" name="imageURL" id="imageURL" value="">';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_images_add()" id="okAddImage">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addImage";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("imageName").focus();
			},10);
			break;	
		case "editImage":
			var numImageSelected = -1;
			var numImages = POLE.images.length;
			for(var i=0;i<numImages;i++){
				if(document.getElementById("imageList_"+i).className == "button_selected"){
					numImageSelected = i;
				}
			}
	
			if(numImageSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Edit Image Name:</h2>';
				html += '<input class="wideBox" type="text" name="imageName" id="imageName" value="'+ POLE.images[numImageSelected].name +'">';
				html += '<h2>Edit Image URL:</h2>';
				html += '<input class="wideBox" type="text" name="imageURL" id="imageURL" value="'+ POLE.images[numImageSelected].url +'">';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_images_edit()" id="okEditImage">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				document.getElementById("popUp").className = "editImage";
				document.getElementById("popUp").innerHTML = html;
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("imageName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END IMAGES
			
		//TILES
		//------------------------------------------------------------------
		case "addTileSheet":
			var html = '<div id="popUpContent">';
			html += '<h2>Tile Sheet Name:</h2>'
			html += '<input class="wideBox" type="text" name="tileSheetName" id="tileSheetName" value="">';
			html += '<hr>';
			html += '<h2>Select Image:</h2>';
			html += '<select  class="wideBox" name="imageSelect" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
			var numImages = POLE.images.length;
			for(var i=0;i<numImages;i++){
				html += '<option>'+POLE.images[i].name+'</option>';
			}
			html += '</select>';
			html += '<div id="sheetCanvasContainer"></div>';
			html += '<div id="tileSheetDisplayControls">';
			html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
			html += '</div>';
			html += '<hr>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Tile Dimensions:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_tile_Width" id="tileSheet_tile_Width" value="'+POLE.scenes[PE.sceneSelected].tileWidth+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_tile_Height" id="tileSheet_tile_Height" value="'+POLE.scenes[PE.sceneSelected].tileHeight+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Number of Tiles:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_numHorizontal" id="tileSheet_numHorizontal" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_numVertical" id="tileSheet_numVertical" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox" style="border:none;">';
			html += '<h2>Origin:</h2>';
			html += '<span class="label">x:</span><input class="smallInputs" type="text" name="tileSheet_originX" id="tileSheet_originX" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" name="tileSheet_originY" id="tileSheet_originY" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			html += '<hr>';

			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_tiles_tileSheets_add()" id="okAddTileSheet">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			this.tileSheetScale = 1;
			this.tileSheetGridColor = "blue";
			
			document.getElementById("popUp").className = "addTileSheet";
			document.getElementById("popUp").innerHTML = html;
			this.assets_sheetsPreview_draw();
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tileSheetName").focus();
			},10);
			break;
		case "editTileSheet":
			var tileSheetIndex = -1;
			if(document.getElementById("tileSheetList").selectedIndex != -1){
				var tileSheetIndex = document.getElementById("tileSheetList").selectedIndex;
				var html = '<div id="popUpContent">';
				html += '<h2>Tile Sheet Name:</h2>'
				html += '<input class="wideBox" type="text" name="tileSheetName" id="tileSheetName" value="'+POLE.tileSheets[tileSheetIndex].name+'">';
				html += '<hr>';
				html += '<h2>Select Image:</h2>';
				html += '<select  class="wideBox" name="imageSelect" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
				var numImages = POLE.images.length;
				for(var i=0;i<numImages;i++){
					html += '<option>'+POLE.images[i].name+'</option>';
				}
				html += '</select>';
				html += '<div id="sheetCanvasContainer"></div>';
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div class="thirdBox">';
				html += '<h2>Tile Dimensions:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_tile_Width" id="tileSheet_tile_Width" value="'+POLE.tileSheets[tileSheetIndex].tileDimensions.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_tile_Height" id="tileSheet_tile_Height" value="'+POLE.tileSheets[tileSheetIndex].tileDimensions.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
				
				html += '<div class="thirdBox">';
				html += '<h2>Number of Tiles:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_numHorizontal" id="tileSheet_numHorizontal" value="'+POLE.tileSheets[tileSheetIndex].numTiles.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_numVertical" id="tileSheet_numVertical" value="'+POLE.tileSheets[tileSheetIndex].numTiles.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
				
				html += '<div class="thirdBox" style="border:none;">';
				html += '<h2>Origin:</h2>';
				html += '<span class="label">x:</span><input class="smallInputs" type="text" name="tileSheet_originX" id="tileSheet_originX" value="'+POLE.tileSheets[tileSheetIndex].origin.x+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" name="tileSheet_originY" id="tileSheet_originY" value="'+POLE.tileSheets[tileSheetIndex].origin.y+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_tiles_tileSheets_edit()" id="okEditTileSheet">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";

				document.getElementById("popUp").className = "editTileSheet";
				document.getElementById("popUp").innerHTML = html;
				document.getElementById("imageSelect").selectedIndex = POLE.tileSheets[tileSheetIndex].image;
				this.assets_sheetsPreview_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("tileSheetName").focus();
				},10);
			}
			break;
		case "addTileSheetAnimation":
			if(this.tileSelected.sheetNum != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="">';
				html += '<hr>';
				html += '<h2>Tile Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';

				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_tiles_tileSprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span>end:</span><input type="text" id="endFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_tiles_tileSprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';
				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_tiles_tileSprites_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopActorSheetAnimation" onclick="PE.assets_tiles_tileSprites_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playActorSheetAnimation" onclick="PE.assets_tiles_tileSprites_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_tiles_tileSprites_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "addTileSheetAnimation";
				document.getElementById("popUp").innerHTML = html;
				
				this.assets_tiles_tileSprites_animation_control('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_tiles_tileSprites_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);
			}
			break;
		case "editTileSheetAnimation":
			if(this.tileAnimationSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="'+ POLE.tileSheets[PE.tileSelected.sheetNum].animations[PE.tileAnimationSelected].name + '">';
				html += '<hr>';
				html += '<h2>Tile Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="'+ POLE.tileSheets[PE.tileSelected.sheetNum].animations[PE.tileAnimationSelected].startFrame + '" style="width:40px;float:right;" onblur="PE.assets_tiles_tileSprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span>end:</span><input type="text" id="endFrame" value="'+ POLE.tileSheets[PE.tileSelected.sheetNum].animations[PE.tileAnimationSelected].endFrame + '" style="width:40px;float:right;" onblur="PE.assets_tiles_tileSprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';
				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_tiles_tileSprites_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopActorSheetAnimation" onclick="PE.assets_tiles_tileSprites_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playActorSheetAnimation" onclick="PE.assets_tiles_tileSprites_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_tiles_tileSprites_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "editTileSheetAnimation";
				document.getElementById("popUp").innerHTML = html;				
				document.getElementById("loopAnimationPreview").checked = POLE.tileSheets[PE.tileSelected.sheetNum].animations[PE.tileAnimationSelected].loop;
				
				this.assets_tiles_tileSprites_animation_control('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_tiles_tileSprites_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);			
			}
			break;
		case "addTiledObjectSheet":
			var html = '<div id="popUpContent">';
			html += '<h2>Tiled Object Sheet Name:</h2>';
			html += '<input class="wideBox" type="text" id="tiledObjectSheetName" value="">';
			html += '<hr>';
			html += '<h2>Select Image:</h2>';
			html += '<select class="wideBox" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
			var numImages = POLE.images.length;
			for(var i=0;i<numImages;i++){
				html += '<option>'+POLE.images[i].name+'</option>';
			}
			html += '</select>';
			html += '<div id="sheetCanvasContainer"></div>';
			
			html += '<div id="tileSheetDisplayControls">';
			html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
			html += '</div>';
			html += '<hr>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Tile Dimensions:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" id="tileSheet_tile_Width" value="'+POLE.scenes[PE.sceneSelected].tileWidth+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="tileSheet_tile_Height" value="'+POLE.scenes[PE.sceneSelected].tileHeight+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Number of Tiles:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" id="tileSheet_numHorizontal" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="tileSheet_numVertical" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox" style="border:none;">';
			html += '<h2>Origin:</h2>';
			html += '<span class="label">x:</span><input class="smallInputs" type="text" id="tileSheet_originX" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" id="tileSheet_originY" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Frame Size:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" id="frameSizeW" value="'+POLE.scenes[PE.sceneSelected].tileWidth+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="frameSizeH" value="'+POLE.scenes[PE.sceneSelected].tileHeight+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox" style="width:150px;border:none;">';
			html += '<h2>Number of Frames:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" id="numFramesW" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="numFramesH" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<hr>';
						
			html += '<div class="okCancelButs">';
			html += '<div><button onclick="PE.assets_tiles_tiledObjectSheets_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button></div>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			this.tileSheetScale = 1;
			this.tileSheetGridColor = "blue";
			
			document.getElementById("popUp").className = "addTiledObjectSheet";
			document.getElementById("popUp").innerHTML = html;
			
			this.assets_sheetsPreview_draw();
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tiledObjectSheetName").focus();
			},10);
			break;
		case "editTiledObjectSheet":
			if(document.getElementById("tiledObjectSheetList").selectedIndex != -1){
				var selectedIndex = document.getElementById("tiledObjectSheetList").selectedIndex ;
				var html = '<div id="popUpContent">';
				html += '<h2>Tiled Object Sheet Name:</h2>';
				html += '<input class="wideBox" type="text" id="tiledObjectSheetName" value="'+POLE.tiledObjectSheets[selectedIndex].name+'">';
				html += '<hr>';
				html += '<h2>Select Image:</h2>';
				html += '<select class="wideBox" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
				var numImages = POLE.images.length;
				for(var i=0;i<numImages;i++){
					html += '<option>'+POLE.images[i].name+'</option>';
				}
				html += '</select>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div class="thirdBox">';
				html += '<h2>Tile Dimensions:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" id="tileSheet_tile_Width" value="'+POLE.tiledObjectSheets[selectedIndex].tileDimensions.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="tileSheet_tile_Height" value="'+POLE.tiledObjectSheets[selectedIndex].tileDimensions.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<div class="thirdBox">';
				html += '<h2>Number of Tiles:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" id="tileSheet_numHorizontal" value="'+POLE.tiledObjectSheets[selectedIndex].numTiles.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="tileSheet_numVertical" value="'+POLE.tiledObjectSheets[selectedIndex].numTiles.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<div class="thirdBox" style="border:none;">';
				html += '<h2>Origin:</h2>';
				html += '<span class="label">x:</span><input class="smallInputs" type="text" id="tileSheet_originX" value="'+POLE.tiledObjectSheets[selectedIndex].origin.x+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" id="tileSheet_originY" value="'+POLE.tiledObjectSheets[selectedIndex].origin.y+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<hr>';
			
				html += '<div class="thirdBox">';
				html += '<h2>Frame Size:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" id="frameSizeW" value="'+POLE.tiledObjectSheets[selectedIndex].frameSize.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="frameSizeH" value="'+POLE.tiledObjectSheets[selectedIndex].frameSize.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<div class="thirdBox" style="width:150px;border:none;">';
				html += '<h2>Number of Frames:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" id="numFramesW" value="'+POLE.tiledObjectSheets[selectedIndex].numFrames.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" id="numFramesH" value="'+POLE.tiledObjectSheets[selectedIndex].numFrames.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<div><button onclick="PE.assets_tiles_tiledObjectSheets_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button></div>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "editTiledObjectSheet";
				document.getElementById("popUp").innerHTML = html;
				document.getElementById("imageSelect").selectedIndex = POLE.tiledObjectSheets[selectedIndex].image;
				this.assets_sheetsPreview_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("tiledObjectSheetName").focus();
				},10);
			}
			break;
		case "addTiledObjectSheetAnimation":
			if(document.getElementById("tiledObjectSheetList").selectedIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="">';
				html += '<hr>';
				html += '<h2>Tile Object Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_tiles_tiledObjects_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span>end:</span><input type="text" id="endFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_tiles_tiledObjects_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';
				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_tiles_tiledObjects_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopActorSheetAnimation" onclick="PE.assets_tiles_tiledObjects_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playActorSheetAnimation" onclick="PE.assets_tiles_tiledObjects_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_tiles_tiledObjects_animation_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "addTiledObjectSheetAnimation";
				document.getElementById("popUp").innerHTML = html;
				
				changeAnimationPreviewState('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_tiles_tiledObjects_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);
			}
			break;
		case "editTiledObjectSheetAnimation":
			if(this.tiledObjectSheetAnimationSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="'+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[PE.tiledObjectSheetAnimationSelected].name+'">';
				html += '<hr>';
				html += '<h2>Tile Object Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="'+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[PE.tiledObjectSheetAnimationSelected].startFrame+'" style="width:40px;float:right;" onblur="PE.assets_tiles_tiledObjects_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span> end:</span><input type="text" id="endFrame" value="'+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[PE.tiledObjectSheetAnimationSelected].endFrame+'" style="width:40px;float:right;" onblur="PE.assets_tiles_tiledObjects_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';
				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_tiles_tiledObjects_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopActorSheetAnimation" onclick="PE.assets_tiles_tiledObjects_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playActorSheetAnimation" onclick="PE.assets_tiles_tiledObjects_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_tiles_tiledObjects_animation_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "editTiledObjectSheetAnimation";
				document.getElementById("popUp").innerHTML = html;
				
				document.getElementById("loopAnimationPreview").checked = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].animations[PE.tiledObjectSheetAnimationSelected].loop;
				
				changeAnimationPreviewState('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_tiles_tiledObjects_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END TILES
			
		//SPRITES
		//------------------------------------------------------------------
		case "addSpriteSheet":
			var html = '<div id="popUpContent">';
			html += '<h2>Sprite Sheet Name:</h2>';
			html += '<input class="wideBox" type="text" id="spriteSheetName" value="">';
			html += '<hr>';
			html += '<h2>Select Image:</h2>';
			html += '<select class="wideBox" name="imageSelect" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
			var numImages = POLE.images.length;
			for(var i=0;i<numImages;i++){
				html += '<option>'+POLE.images[i].name+'</option>';
			}
			html += '</select>';
			html += '<div id="sheetCanvasContainer"></div>';
			
			html += '<div id="tileSheetDisplayControls">';
			html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
			html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
			html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
			html += '</div>';
			html += '<hr>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Tile Dimensions:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_tile_Width" id="tileSheet_tile_Width" value="'+POLE.scenes[PE.sceneSelected].tileWidth+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_tile_Height" id="tileSheet_tile_Height" value="'+POLE.scenes[PE.sceneSelected].tileHeight+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox">';
			html += '<h2>Number of Tiles:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_numHorizontal" id="tileSheet_numHorizontal" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_numVertical" id="tileSheet_numVertical" value="1" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<div class="thirdBox" style="border:none;">';
			html += '<h2>Origin:</h2>';
			html += '<span class="label">x:</span><input class="smallInputs" type="text" name="tileSheet_originX" id="tileSheet_originX" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" name="tileSheet_originY" id="tileSheet_originY" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="thirdBox" style="border:none;">';
			html += '<h2>Offset:</h2>';
			html += '<span class="label">x:</span><input class="smallInputs" type="text" id="tileSheet_offsetX" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"><span class="label">y:</span><input class="smallInputs" type="text" id="tileSheet_offsetY" value="0" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');">';
			html += '</div>';
						
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_sprites_spriteSheets_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			this.tileSheetScale = 1;
			this.tileSheetGridColor = "blue";
			
			document.getElementById("popUp").className = "addSpriteSheet";
			document.getElementById("popUp").innerHTML = html;

			this.assets_sheetsPreview_draw();
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("spriteSheetName").focus();
			},10);
			break;
		case "editSpriteSheet":
			var tileSheetIndex = -1;
			if(document.getElementById("spriteSheetList").selectedIndex != -1){
				var tileSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
				var html = '<div id="popUpContent">';
				html += '<h2>Sprite Sheet Name:</h2>';
				html += '<input class="wideBox" type="text" id="spriteSheetName" value="'+POLE.spriteSheets[tileSheetIndex].name+'">';
				html += '<hr>';
				html += '<h2>Select Image:</h2>';
				html += '<select class="wideBox" name="imageSelect" id="imageSelect" onchange="PE.assets_sheetsPreview_draw()">';
			
				var numImages = POLE.images.length;
				for(var i=0;i<numImages;i++){
					html += '<option>'+POLE.images[i].name+'</option>';
				}
				html += '</select>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
			
				html += '<div class="thirdBox">';
				html += '<h2>Tile Dimensions:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_tile_Width" id="tileSheet_tile_Width" value="'+POLE.spriteSheets[tileSheetIndex].tileDimensions.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_tile_Height" id="tileSheet_tile_Height" value="'+POLE.spriteSheets[tileSheetIndex].tileDimensions.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<div class="thirdBox">';
				html += '<h2>Number of Tiles:</h2>';
				html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tileSheet_numHorizontal" id="tileSheet_numHorizontal" value="'+POLE.spriteSheets[tileSheetIndex].numTiles.w+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tileSheet_numVertical" id="tileSheet_numVertical" value="'+POLE.spriteSheets[tileSheetIndex].numTiles.h+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<div class="thirdBox" style="border:none;">';
				html += '<h2>Origin:</h2>';
				html += '<span class="label">x:</span><input class="smallInputs" type="text" name="tileSheet_originX" id="tileSheet_originX" value="'+POLE.spriteSheets[tileSheetIndex].origin.x+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">y:</span><input class="smallInputs" type="text" name="tileSheet_originY" id="tileSheet_originY" value="'+POLE.spriteSheets[tileSheetIndex].origin.y+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
				html += '</div>';
			
				html += '<hr>';
			
				html += '<div class="thirdBox" style="border:none;">';
				html += '<h2>Offset:</h2>';
				html += '<span class="label">x:</span><input class="smallInputs" type="text" id="tileSheet_offsetX" value="'+POLE.spriteSheets[tileSheetIndex].offset.x+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"><span class="label">y:</span><input class="smallInputs" type="text" id="tileSheet_offsetY" value="'+POLE.spriteSheets[tileSheetIndex].offset.y+'" onblur="PE.assets_sheetsPreview_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');">';
				html += '</div>';
						
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_sprites_spriteSheets_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";

				document.getElementById("popUp").className = "editSpriteSheet";
				document.getElementById("popUp").innerHTML = html;
				document.getElementById("imageSelect").selectedIndex = POLE.spriteSheets[tileSheetIndex].image;
				
				this.assets_sheetsPreview_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("spriteSheetName").focus();
				},10);
			}
			break;
		case "addSpriteSheetAnimation":
			if(document.getElementById("spriteSheetList").selectedIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="">';
				html += '<hr>';
				html += '<h2>Sprite Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span> end:</span><input type="text" id="endFrame" value="0" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '<h2>Offset:</h2><br>';
				html += '<div style="display:block;width:100%;float:left;"><span>x:</span><input type="text" id="offsetX" value="0" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span>y:</span><input type="text" id="offsetY" value="0" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></div><hr style="width:100%;">';
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';

				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_sprites_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopspriteSheetAnimation" onclick="PE.assets_sprites_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playspriteSheetAnimation" onclick="PE.assets_sprites_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_sprites_animation_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "addSpriteSheetAnimation";
				document.getElementById("popUp").innerHTML = html;
				
				this.assets_sprites_animation_control('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_sprites_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);
			}
			break;
		case "editSpriteSheetAnimation":
			var spriteSheetIndex = document.getElementById("spriteSheetList").selectedIndex;
			var numAnimations = POLE.spriteSheets[spriteSheetIndex].animations.length;
			var animationIndex = -1;
			for(var i=0;i<numAnimations;i++){
				if(document.getElementById("dSAniList_"+i).className == "button_selected"){
					animationIndex = i;
				}
			}	
			if(spriteSheetIndex != -1 && animationIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Animation Name:</h2>';
				html += '<input class="wideBox" type="text" id="animationName" value="'+ POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].name + '">';
				html += '<hr>';
				html += '<h2>Sprite Sheet:</h2>';
				html += '<div id="sheetCanvasContainer"></div>';
				
				html += '<div id="tileSheetDisplayControls">';
				html += '<button class="tileScale_unselected" id="sheetScale_3" onclick="PE.assets_sheetsPreview_scale(this)">300%</button><button class="tileScale_unselected" id="sheetScale_2" onclick="PE.assets_sheetsPreview_scale(this)">200%</button><button class="tileScale_selected" id="sheetScale_1" onclick="PE.assets_sheetsPreview_scale(this)">100%</button><button class="tileScale_unselected" id="sheetScale_5" onclick="PE.assets_sheetsPreview_scale(this)">50%</button><button class="tileScale_unselected" id="sheetScale_25" onclick="PE.assets_sheetsPreview_scale(this)">25%</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_none" onclick="PE.tileSheetGridColor=\'none\';PE.assets_sheetsPreview_draw();">X</button>';
				html += '<button class="tileSheetGridColor" id="tsgc_black" onclick="PE.tileSheetGridColor=\'black\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_white" onclick="PE.tileSheetGridColor=\'white\';PE.assets_sheetsPreview_draw();"></button>';
				html += '<button class="tileSheetGridColor" id="tsgc_blue" onclick="PE.tileSheetGridColor=\'blue\';PE.assets_sheetsPreview_draw();"></button>';
				html += '</div>';
				html += '<hr>';
				
				html += '<div id="animation_info">';
				html += '<h2>Frames:</h2>';
				html += '<div style="display:block;width:100%;float:left;"><span>start:</span><input type="text" id="startFrame" value="'+ POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].startFrame + '" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span> end:</span><input type="text" id="endFrame" value="'+ POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].endFrame + '" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"></div><hr style="width:100%;">';
				html += '<h2>Offset:</h2><br>';
				html += '<div style="display:block;width:100%;float:left;"><span>x:</span><input type="text" id="offsetX" value="'+ POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].offset.x + '" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></div>';
				html += '<div style="display:block;width:100%;float:left;margin-top:5px;margin-bottom:10px;"><span>y:</span><input type="text" id="offsetY" value="'+ POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].offset.y + '" style="width:40px;float:right;" onblur="PE.assets_sprites_animation_draw()" onkeypress="return PE.restrictCharacters(this, event, \'posNegInteger\');"></div><hr style="width:100%;">';				
				html += '</div>';
				html += '<div id="animationPreview_container">';
				html += '<h2>Animation Preview:</h2>';
				html += '<div id="animationPreview">';
				html += '</div>';
				
				html += '<div class="animationControls">';
				html += '<div class="loopControl">';
				html += '<input type="checkBox" id="loopAnimationPreview" onblur="PE.assets_sprites_animation_draw()"/>';
				html += '<label for="loopAnimationPreview"><span></span>Loop</label>';
				html += '</div>';
				html += '<button class="tool_button animationControlButton" id="stopspriteSheetAnimation" onclick="PE.assets_sprites_animation_control(\'stop\')" ></button>';
				html += '<button class="tool_button animationControlButton" id="playspriteSheetAnimation" onclick="PE.assets_sprites_animation_control(\'play\')" ></button>';
				html += '</div>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_sprites_animation_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent				
				
				this.tileSheetScale = 1;
				this.tileSheetGridColor = "blue";
			
				document.getElementById("popUp").className = "editSpriteSheetAnimation";
				document.getElementById("popUp").innerHTML = html;
				document.getElementById("loopAnimationPreview").checked = POLE.spriteSheets[spriteSheetIndex].animations[animationIndex].loop;
				
				this.assets_sprites_animation_control('play');			
				
				this.assets_sheetsPreview_draw();
				this.assets_sprites_animation_draw();
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("animationName").focus();
				},10);
			}
			break;
		//-----------------------------------------------------------------
		//END SPRITES
			
		//ACTORS
		//------------------------------------------------------------------
		case "addActor":
			var html = '<div id="popUpContent" style="width:800px;">';
			
			html += '<div id="popUp_leftSide">';
			
			html += '<h2>Actor Name:</h2><br><input type="text" id="actorName" value="" style="width:380px;"  onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
			
			html += '<h2>Bodies:</h2><br>';
			html += '<select id="bodySelect" style="width:380px;" onchange="PE.assets_actors_body_select()"><option>Body_0</option></select>';
			html += '<div id="bodiesContainer">';
			html += '<h2>Body Name:</h2><br>';
			html += '<input type="text" id="bodyName" value="Body_0" style="width:350px;" onblur="PE.assets_actors_body_update();PE.assets_actors_body_name();" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
			html += '<hr style="width:350px;">';
			
			html += '<div id="positionAndParent" style="display:block;float:left;width:350px;margin-bottom:10px;">';
			html += '</div>';
			
			html += '<div style="display:block;float:left;width:90px;margin-right:10px;margin-bottom:10px;">';
			html += '<h2>Shape:</h2><br>';
			html += '<select id="shapeType" style="width:90px;" onchange="PE.assets_actors_body_changeShape()">';
			html += '<option>Box</option>';
			html += '<option>Circle</option>';
			html += '<option>Polygon</option>';
			html += '<option>Tile</option>';
			html += '</select>';
			html += '<h2>Type:</h2><br>';
			html += '<select id="bodyType" style="width:90px;" onchange="">';
			html += '<option>Dynamic</option>';
			html += '<option>Static</option>';
			html += '<option>Kinematic</option>';
			html += '</select>';
			html += '</div>';
			
			html += '<div id="shapeDefinitionContainer" style="display:block;float:left;width:240px;margin-right:10px;margin-bottom:20px;">';
			html += '<h2>Shape Definition:</h2><br>';
			html += '<div id="shapeDefinition">';
			html += '<span>w:</span><input type="text" id="box_w" value="' + POLE.scenes[PE.sceneSelected].tileWidth + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
			html += '<span> h:</span><input type="text" id="box_h" value="' + POLE.scenes[PE.sceneSelected].tileHeight + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
			html += '</div>';
			html += '</div>';
			
			html += '<hr style="width:350px;">';
	
			html += '<div>';
			html += '<input type="checkBox" id="fixedRotation" onclick="PE.assets_actors_body_update();"/>';
			html += '<label for="fixedRotation"><span></span>Fixed Rotation</label>';
			html += '</div>';
			
			html += '<hr style="width:350px;">';
			
			html += '<h2>Fixture Definiton:</h2>';
			html += '<div style="display:block;float:left;width:350px;margin-bottom:10px;">';
			html += '<table>';
			html += '<tr>';
			html += '<td><h2>Density:</h2></td><td><input type="text" id="density" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Friction:</h2></td><td><input type="text" id="friction" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Restitution:</h2></td><td><input type="text" id="restitution" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Filter Group:</h2></td><td><input type="text" id="filterGroup" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
			html += '</tr>';
			html += '</table>';
			html += '</div>';
			html += '<hr style="width:350px;">';			
			
			html += '<div style="display:block;float:left;width:350px;">';
			html += '<h2>Sprite Sheet:</h2><br><select id="spriteSheetSelect" style="width:350px;" onchange="PE.assets_actors_body_changeSprite()">';
			html += '<option>None</option>';
			var numSpriteSheets = POLE.spriteSheets.length;
			for(var i=0;i<numSpriteSheets;i++){
				html += '<option>'+POLE.spriteSheets[i].name+'</option>';
			}
			html += '</select>';
			html += '</div>';
			
			html += '<div style="display:block;float:left;width:350px;margin-top:10px;">';
			html += '<h2>Animation:</h2><br><select id="animationSelect" style="width:350px;" onchange="PE.assets_actors_body_changeAnimation()">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			
			html += '<div style="display:block;float:left;width:350px;margin-top:10px;margin-bottom:10px;">';
			html += '<h2>Frame Number:</h2><br><select id="frameNumberSelect" style="width:100px;" onchange="">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<hr style="width:350px;">';
			
			html += '</div>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_actors_body_add()">Add Body</button><button onclick="PE.assets_actors_body_remove()">Remove Body</button>';
			html += '</div>';
			html += '<hr>';
			
			html += '<h2>Joints:</h2><br>';
			html += '<select id="jointSelect" style="width:380px;" onchange="PE.assets_actors_joint_select()"></select>';
			html += '<div id="jointsContainer"></div>';
			
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_actors_joint_add()">Add Joint</button><button onclick="PE.assets_actors_joint_remove()">Remove Joint</button>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_actors_add()">Ok</button><button onclick="PE.assets_actors_edit_cancel()">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUp_leftSide
			
			html += '<div id="popUp_rightSide">';
				
			html += '<h2>Actor Preview:</h2>';
			html += '<div id="actorPreview_container">';
			html += '<div id="actorPreview">';
			html += '</div>';
			html += '</div>';
			
			html += '</div>';
			//end popUp_rightSide	
			
			html += '</div>';
			//end popUpContent	
			
			//keep track of the bodies for the actor
			this.bodies = [];
			this.bodies.push({name:"Body_0",position:{x:0,y:0},parentBody:null,shape:"box",shapeDefinition:{w:64,h:64},type:"dynamic",fixedRotation:false,fixDef:{density:1,friction:1,restitution:0,filter:{groupIndex:0}},spriteSheet:null,animation:null,frame:null});
			this.bodySelected = 0;
			
			//keep track of the joints for the actor
			this.joints = [];
			
			document.getElementById("popUp").className = "addActor";
			document.getElementById("popUp").innerHTML = html;
			
			this.assets_actors_preview();
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "800px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("actorName").focus();
			},10);
			break;
		case "editActor":
			if(this.actorSelected != -1){			
				//keep track of the bodies for the actor
				this.bodies = [];
				var numBodies = POLE.actors[this.actorSelected].bodies.length;
				for(var b=0;b<numBodies;b++){
					//this.bodies.push(POLE.actors[this.actorSelected].bodies[b]);
					
					var body = {
						name:String(POLE.actors[this.actorSelected].bodies[b].name),
						position:{
							x:Number(POLE.actors[this.actorSelected].bodies[b].position.x),
							y:Number(POLE.actors[this.actorSelected].bodies[b].position.y)
						},
						parentBody:null,
						shape:String(POLE.actors[this.actorSelected].bodies[b].shape),
						shapeDefinition:{},
						type:String(POLE.actors[this.actorSelected].bodies[b].type),
						fixedRotation:Boolean(POLE.actors[this.actorSelected].bodies[b].fixedRotation),
						fixDef:{
							density:Number(POLE.actors[this.actorSelected].bodies[b].fixDef.density),
							friction:Number(POLE.actors[this.actorSelected].bodies[b].fixDef.friction),
							restitution:Number(POLE.actors[this.actorSelected].bodies[b].fixDef.restitution),
							filter:{
								groupIndex:Number(POLE.actors[this.actorSelected].bodies[b].fixDef.filter.groupIndex)
							}
						},
						spriteSheet:null,
						animation:null,
						frame:null
					};
					
					if(POLE.actors[this.actorSelected].bodies[b].parentBody != null){
						body.parentBody = Number(POLE.actors[this.actorSelected].bodies[b].parentBody);
					}
					
					switch(POLE.actors[this.actorSelected].bodies[b].shape){
						case "box":
							body.shapeDefinition.w = Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition.w);
							body.shapeDefinition.h = Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition.h);
							break;
						case "circle":
							body.shapeDefinition.radius = Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition.radius);
							break;
						case "poly":
							var numPoints = POLE.actors[this.actorSelected].bodies[b].shapeDefinition.length;
							body.shapeDefinition = [];
							for(var p=0;p<numPoints;p++){
								body.shapeDefinition.push({x:Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition[p].x),y:Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition[p].y)});
							}
							break;
						case "tile":
							body.shapeDefinition.w = Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition.w);
							body.shapeDefinition.h = Number(POLE.actors[this.actorSelected].bodies[b].shapeDefinition.h);
							break;
					}
					
					if(POLE.actors[this.actorSelected].bodies[b].spriteSheet != null){
						body.spriteSheet = Number(POLE.actors[this.actorSelected].bodies[b].spriteSheet);
					}
					
					if(POLE.actors[this.actorSelected].bodies[b].animation != null){
						body.animation = Number(POLE.actors[this.actorSelected].bodies[b].animation);
					}
					
					if(POLE.actors[this.actorSelected].bodies[b].frame != null){
						body.frame = Number(POLE.actors[this.actorSelected].bodies[b].frame);
					}
					
					this.bodies.push(body);

				}
				this.bodySelected = 0;
			
				//keep track of the joints for the actor
				this.joints = [];
				var numJoints = POLE.actors[this.actorSelected].joints.length;
				for(var j=0;j<numJoints;j++){
					this.joints.push(POLE.actors[this.actorSelected].joints[j]);
				}
				this.jointSelected = 0;
			
				var html = '<div id="popUpContent" style="width:800px;">';
				
				html += '<div id="popUp_leftSide">';
				
				html += '<h2>Actor Name:</h2><br><input type="text" id="actorName" value="'+POLE.actors[PE.actorSelected].name+'" style="width:380px;"  onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
				
				html += '<h2>Bodies:</h2><br>';
				html += '<select id="bodySelect" style="width:380px;" onchange="PE.assets_actors_body_select()"><option>Body_0</option></select>';
				html += '<div id="bodiesContainer">';
				html += '<h2>Body Name:</h2><br>';
				html += '<input type="text" id="bodyName" value="Body_0" style="width:350px;" onblur="PE.assets_actors_body_update();PE.assets_actors_body_name();" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
				html += '<hr style="width:350px;">';
			
				html += '<div id="positionAndParent" style="display:block;float:left;width:350px;margin-bottom:10px;">';
				html += '</div>';
			
				html += '<div style="display:block;float:left;width:90px;margin-right:10px;margin-bottom:10px;">';
				html += '<h2>Shape:</h2><br>';
				html += '<select id="shapeType" style="width:90px;" onchange="PE.assets_actors_body_changeShape()">';
				html += '<option>Box</option>';
				html += '<option>Circle</option>';
				html += '<option>Polygon</option>';
				html += '<option>Tile</option>';
				html += '</select>';
				html += '<h2>Type:</h2><br>';
				html += '<select id="bodyType" style="width:90px;" onchange="">';
				html += '<option>Dynamic</option>';
				html += '<option>Static</option>';
				html += '<option>Kinematic</option>';
				html += '</select>';
				html += '</div>';
			
				html += '<div id="shapeDefinitionContainer" style="display:block;float:left;width:240px;margin-right:10px;margin-bottom:20px;">';
				html += '<h2>Shape Definition:</h2><br>';
				html += '<div id="shapeDefinition">';
				html += '<span >w:</span><input type="text" id="box_w" value="' + POLE.scenes[PE.sceneSelected].tileWidth + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				html += '<span > h:</span><input type="text" id="box_h" value="' + POLE.scenes[PE.sceneSelected].tileHeight + '" style="width:40px;" onblur="PE.assets_actors_body_update()">';
				html += '</div>';
				html += '</div>';
			
				html += '<hr style="width:350px;">';
	
				html += '<div>';
				html += '<input type="checkBox" id="fixedRotation" onclick="PE.assets_actors_body_update();"/>';
				html += '<label for="fixedRotation"><span></span>Fixed Rotation</label>';
				html += '</div>';
			
				html += '<hr style="width:350px;">';
			
				html += '<h2>Fixture Definiton:</h2>';
				html += '<div style="display:block;float:left;width:350px;margin-bottom:10px;">';
				html += '<table>';
				html += '<tr>';
				html += '<td><h2>Density:</h2></td><td><input type="text" id="density" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
				html += '</tr>';
				html += '<tr>';
				html += '<td><h2>Friction:</h2></td><td><input type="text" id="friction" value="1" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
				html += '</tr>';
				html += '<tr>';
				html += '<td><h2>Restitution:</h2></td><td><input type="text" id="restitution" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
				html += '</tr>';
				html += '<tr>';
				html += '<td><h2>Filter Group:</h2></td><td><input type="text" id="filterGroup" value="0" style="width:40px;" onblur="PE.assets_actors_body_update()"></td>';
				html += '</tr>';
				html += '</table>';
				html += '</div>';
				html += '<hr style="width:350px;">';			
			
				html += '<div style="display:block;float:left;width:350px;">';
				html += '<h2>Sprite Sheet:</h2><br><select id="spriteSheetSelect" style="width:350px;" onchange="PE.assets_actors_body_changeSprite()">';
				html += '<option>None</option>';
				var numSpriteSheets = POLE.spriteSheets.length;
				for(var i=0;i<numSpriteSheets;i++){
					html += '<option>'+POLE.spriteSheets[i].name+'</option>';
				}
				html += '</select>';
				html += '</div>';
			
				html += '<div style="display:block;float:left;width:350px;margin-top:10px;">';
				html += '<h2>Animation:</h2><br><select id="animationSelect" style="width:350px;" onchange="PE.assets_actors_body_changeAnimation()">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
			
				html += '<div style="display:block;float:left;width:350px;margin-top:10px;margin-bottom:10px;">';
				html += '<h2>Frame Number:</h2><br><select id="frameNumberSelect" style="width:100px;" onchange="">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<hr style="width:350px;">';
			
				html += '</div>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_actors_body_add()">Add Body</button><button onclick="PE.assets_actors_body_remove()">Remove Body</button>';
				html += '</div>';
				
				html += '<hr>';
			
				html += '<h2>Joints:</h2><br>';
				html += '<select id="jointSelect" style="width:380px;" onchange="PE.assets_actors_joint_select()"></select>';
				html += '<div id="jointsContainer"></div>';

				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_actors_joint_add()">Add Joint</button><button onclick="PE.assets_actors_joint_remove()">Remove Joint</button>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<div><button onclick="PE.assets_actors_edit()">Ok</button><button onclick="PE.assets_actors_edit_cancel()">Cancel</button></div>';
				html += '</div>';
				
				html += '</div>';
				//end popUp_leftSide
				
				html += '<div id="popUp_rightSide">';
				
				html += '<h2>Actor Preview:</h2>';
				html += '<div id="actorPreview_container">';
				html += '<div id="actorPreview">';
				html += '</div>';
				html += '</div>';
				
				html += '</div>';
				//end popUp_rightSide
				
				html += '</div>';
				//end popUpContent	
			
				document.getElementById("popUp").className = "editActor";
				document.getElementById("popUp").innerHTML = html;
						
				this.assets_actors_body_update_gui();
				this.assets_actors_preview();
				
				if(this.joints.length > 0){
					this.jointSelected = 0;
					this.assets_actors_joint_fillList();
					this.assets_actors_joint_update_gui();
				}
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "800px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("actorName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END ACTORS
			
		//SOUNDS
		//------------------------------------------------------------------
		case "addSound":
			var html = '<div id="popUpContent">';
			html += '<h2>Sound Name:</h2>';
			html += '<input class="wideBox" type="text" id="soundName" value="" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
			html += '<h2>ogg URL:</h2>';
			html += '<input class="wideBox" type="text" id="oggURL" value="">';
			html += '<h2>mp3 URL:</h2>';
			html += '<input class="wideBox" type="text" id="mp3URL" value="">';
			
			html += '<div class="okCancelButs">';
			html += '<button class="tool_button" id="previewSound" onclick="PE.assets_sounds_preview_play()" ></button>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.assets_sounds_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addSound";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("soundName").focus();
			},10);
			break;	
		case "editSound":
			this.popUpSize.w = 400;
			this.popUpSize.h = 220;
			var numSoundSelected = -1;
			var numSounds = POLE.sounds.length;
			for(var i=0;i<numSounds;i++){
				if(document.getElementById("soundList_"+i).className == "button_selected"){
					numSoundSelected = i;
				}
			}
	
			if(numSoundSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Sound Name:</h2>';
				html += '<input class="wideBox" type="text" id="soundName" value="'+ POLE.sounds[numSoundSelected].name +'" onkeypress="return PE.restrictCharacters(this, event, \'varName\');">';
				html += '<h2>ogg URL:</h2>';
				html += '<input class="wideBox" type="text" id="oggURL" value="'+ POLE.sounds[numSoundSelected].ogg +'">';
				html += '<h2>mp3 URL:</h2>';
				html += '<input class="wideBox" type="text" id="mp3URL" value="'+ POLE.sounds[numSoundSelected].mp3 +'">';
				
				html += '<div class="okCancelButs">';
				html += '<button class="tool_button" id="previewSound" onclick="PE.assets_sounds_preview_play()" ></button>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.assets_sounds_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				document.getElementById("popUp").className = "editSound";
				document.getElementById("popUp").innerHTML = html;
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("soundName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END SOUNDS
		
		//END ASSETS
		
		//SCENES
		
		//SET UP
		//------------------------------------------------------------------
		case "edit_tileDimensions":
			var html = '<div id="popUpContent">';
			html += '<h2>Tile Dimensions:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" id="tileWidth" value="'+POLE.scenes[PE.sceneSelected].tileWidth+'" onblur="PE.scene_setUp_tileDimensions_blur();" onkeypress="return PE.restrictCharacters(this, event, \'digits\');">';
			html += '<span class="label">h:</span><input class="smallInputs" type="text" id="tileHeight" value="'+POLE.scenes[PE.sceneSelected].tileHeight+'" onblur="PE.scene_setUp_tileDimensions_blur();" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><br>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_setUp_tileDimensions()">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
				
			document.getElementById("popUp").className = "edit_tileDimensions";
			document.getElementById("popUp").innerHTML = html;
			
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tileWidth").focus();
			},10);
			break;
		case "edit_mapDimensions":
			this.mapLock = "middle";
			var html = '<div id="popUpContent">';
			html += '<div class="mapDimensions">';
			html += '<h2>Map Dimensions:</h2>';
			html += '<span class="label">w:</span><input class="smallInputs" type="text" name="tilesWide" id="tilesWide" value="'+POLE.scenes[PE.sceneSelected].tilesWide+'" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span class="label">h:</span><input class="smallInputs" type="text" name="tilesHigh" id="tilesHigh" value="'+POLE.scenes[PE.sceneSelected].tilesHigh+'" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><br>';
			html += '</div>';			
						
			html += '<div class="mapDimensionsLock" id="mapDimensionsLock">';
			html += '<button class="mapDimensionsLockDirection" id="upLeft" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="up" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="upRight" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="left" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="middle" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="right" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="downLeft" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="down" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '<button class="mapDimensionsLockDirection" id="downRight" onclick="PE.scene_setUp_mapDimensions_lock(this)"></button>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_setUp_mapDimensions()">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "edit_mapDimensions";
			document.getElementById("popUp").innerHTML = html;
			
			switch(POLE.scenes[this.sceneSelected].type){
				case "orthogonal":
					document.getElementById("mapDimensionsLock").style.transform = "rotate(0deg)";
					document.getElementById("mapDimensionsLock").style.msTransform = "rotate(0deg)";
					document.getElementById("mapDimensionsLock").style.webkitTransform = "rotate(0deg)";
					break;
				case "isometric":
					document.getElementById("mapDimensionsLock").style.transform = "rotate(45deg)";
					document.getElementById("mapDimensionsLock").style.msTransform = "rotate(45deg)";
					document.getElementById("mapDimensionsLock").style.webkitTransform = "rotate(45deg)";
					break;
				case "hexagonal":
					document.getElementById("mapDimensionsLock").style.transform = "rotate(0deg)";
					document.getElementById("mapDimensionsLock").style.msTransform = "rotate(0deg)";
					document.getElementById("mapDimensionsLock").style.webkitTransform = "rotate(0deg)";
					break;	
			}
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tilesWide").focus();
			},10);
			break;
		//------------------------------------------------------------------
		//END SET UP
		
		//ASSETS
		//------------------------------------------------------------------
		case "addTileSprite":
			var html = '<div id="popUpContent">';
			html += '<h2>Tile Sprite Name:</h2><br><input type="text" id="tileSpriteName" value="" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
			html += '<h2>Tile:</h2><br><span >row:</span><input type="text" id="row" value="0" style="width:40px;"><span > col:</span><input type="text" id="col" value="0" style="width:40px;"><br>';
			html += '<hr>';
			html += '<h2>Tile Sheet:</h2><br><select id="tileSpriteTileSheet" style="width:380px;" onchange="PE.scene_assets_tileSprites_changeTileSheet()">';
			html += '<option>None</option>';
			var numTileSheets = POLE.tileSheets.length;
			for(var i=0;i<numTileSheets;i++){
				html += '<option>'+POLE.tileSheets[i].name+'</option>';
			}
			html += '</select>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Animation:</h2><br><select id="tileSpriteAnimation" style="width:380px;" onchange="PE.scene_assets_tileSprites_changeAnimation()">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Frame Number:</h2><br><select id="tileSpriteFrame" style="width:100px;" onchange="">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Layer:</h2><br><select id="tileSpriteLayer" style="width:50px;">';
			var numLayers = POLE.scenes[this.sceneSelected].layers.length;
			for(var i=0;i<numLayers;i++){
				html += '<option>'+i+'</option>';
			}
			html += '</select>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_assets_tileSprites_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addTileSprite";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tileSpriteName").focus();
			},10);
			break;
		case "editTileSprite":
			var selectedIndex = -1;
			var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
			for(var i=0;i<numTileSprites;i++){
				if(document.getElementById("tileSpriteList_"+i).className == "button_selected"){
					selectedIndex = i;
				}
			}
			if(selectedIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Tile Sprite Name:</h2><br><input type="text" id="tileSpriteName" value="'+POLE.scenes[PE.sceneSelected].tileSprites[selectedIndex].name+'" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
				html += '<h2>Tile:</h2><br><span >row:</span><input type="text" id="row" value="'+POLE.scenes[PE.sceneSelected].tileSprites[selectedIndex].row+'" style="width:40px;"><span > col:</span><input type="text" id="col" value="'+POLE.scenes[PE.sceneSelected].tileSprites[selectedIndex].col+'" style="width:40px;"><br>';
				html += '<hr>';
				html += '<h2>Tile Sheet:</h2><br><select id="tileSpriteTileSheet" style="width:380px;" onchange="PE.scene_assets_tileSprites_changeTileSheet()">';
				html += '<option>None</option>';
				var numTileSheets = POLE.tileSheets.length;
				for(var i=0;i<numTileSheets;i++){
					html += '<option>'+POLE.tileSheets[i].name+'</option>';
				}
				html += '</select>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Animation:</h2><br><select id="tileSpriteAnimation" style="width:380px;" onchange="PE.scene_assets_tileSprites_changeAnimation()">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Frame Number:</h2><br><select id="tileSpriteFrame" style="width:100px;" onchange="">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Layer:</h2><br><select id="tileSpriteLayer" style="width:50px;">';
				var numLayers = POLE.scenes[PE.sceneSelected].layers.length;
				for(var i=0;i<numLayers;i++){
					html += '<option>'+i+'</option>';
				}
				html += '</select>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.scene_assets_tileSprites_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				document.getElementById("popUp").className = "editTileSprite";
				document.getElementById("popUp").innerHTML = html;
			
				document.getElementById("tileSpriteTileSheet").selectedIndex = Number(POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].pIndex) + 1;
				this.scene_assets_tileSprites_changeTileSheet();
				document.getElementById("tileSpriteAnimation").selectedIndex = Number(POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].animation) + 1;
				this.scene_assets_tileSprites_changeAnimation();
			
				var numFrames = document.getElementById("tileSpriteFrame").options.length;
				for(var i=0;i<numFrames;i++){
					if(POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].frame == Number(document.getElementById("tileSpriteFrame").options[i].value)){
						document.getElementById("tileSpriteFrame").selectedIndex  = i;
					}
				}
				document.getElementById("tileSpriteLayer").selectedIndex = Number(POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer);
			
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("tileSpriteName").focus();
				},10);
			}
			break;
		case "addTiledObject":
			var html = '<div id="popUpContent">';
			html += '<h2>Tiled Object Name:</h2><br><input type="text" id="tiledObjectName" value="" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
			html += '<h2>Tile:</h2><br><span >row:</span><input type="text" id="row" value="0" style="width:40px;"><span > col:</span><input type="text" id="col" value="0" style="width:40px;"><br>';
			html += '<hr style="width:380px;">';
			html += '<h2>Tiled Object Sheet:</h2><br><select id="tiledObjectSheet" style="width:380px;" onchange="PE.scene_assets_tiledObjects_changeSheet()">';
			html += '<option>None</option>';
			var numTiledObjectSheets = POLE.tiledObjectSheets.length;
			for(var i=0;i<numTiledObjectSheets;i++){
				html += '<option>'+POLE.tiledObjectSheets[i].name+'</option>';
			}
			html += '</select>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Animation:</h2><br><select id="tiledObjectAnimation" style="width:380px;" onchange="PE.scene_assets_tiledObjects_changeAnimation()">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Frame Number:</h2><br><select id="tiledObjectFrame" style="width:100px;" onchange="">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Layer:</h2><br><select id="tiledObjectLayer" style="width:50px;">';
			var numLayers = POLE.scenes[this.sceneSelected].layers.length;
			for(var i=0;i<numLayers;i++){
				html += '<option>'+i+'</option>';
			}
			html += '</select>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_assets_tiledObjects_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addTiledObject";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("tiledObjectName").focus();
			},10);
			break;
		case "editTiledObject":
			var selectedIndex = -1;
			var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
			for(var i=0;i<numTiledObjects;i++){
				if(document.getElementById("tiledObjectsList_"+i).className == "button_selected"){
					selectedIndex = i;
				}
			}
			if(selectedIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Tiled Object Name:</h2><br><input type="text" id="tiledObjectName" value="'+POLE.scenes[PE.sceneSelected].tiledObjects[selectedIndex].name+'" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
				html += '<h2>Tile:</h2><br><span >row:</span><input type="text" id="row" value="'+POLE.scenes[PE.sceneSelected].tiledObjects[selectedIndex].row+'" style="width:40px;"><span > col:</span><input type="text" id="col" value="'+POLE.scenes[PE.sceneSelected].tiledObjects[selectedIndex].col+'" style="width:40px;"><br>';
				html += '<hr style="width:380px;">';
				html += '<h2>Tiled Object Sheet:</h2><br><select id="tiledObjectSheet" style="width:380px;" onchange="PE.scene_assets_tiledObjects_changeSheet()">';
				html += '<option>None</option>';
				var numTiledObjectSheets = POLE.tiledObjectSheets.length;
				for(var i=0;i<numTiledObjectSheets;i++){
					html += '<option>'+POLE.tiledObjectSheets[i].name+'</option>';
				}
				html += '</select>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Animation:</h2><br><select id="tiledObjectAnimation" style="width:380px;" onchange="PE.scene_assets_tiledObjects_changeAnimation()">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Frame Number:</h2><br><select id="tiledObjectFrame" style="width:100px;" onchange="">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Layer:</h2><br><select id="tiledObjectLayer" style="width:50px;">';
				var numLayers = POLE.scenes[this.sceneSelected].layers.length;
				for(var i=0;i<numLayers;i++){
					html += '<option>'+i+'</option>';
				}
				html += '</select>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.scene_assets_tiledObjects_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				document.getElementById("popUp").className = "editTiledObject";
				document.getElementById("popUp").innerHTML = html;
				
				document.getElementById("tiledObjectSheet").selectedIndex = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex + 1;
				this.scene_assets_tiledObjects_changeSheet();
				if(POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].animation == null){
					document.getElementById("tiledObjectAnimation").selectedIndex = 0;
				}else{
					document.getElementById("tiledObjectAnimation").selectedIndex = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].animation + 1;
				}
				this.scene_assets_tiledObjects_changeAnimation();
				var numFrames = document.getElementById("tiledObjectFrame").options.length;
				for(var i=0;i<numFrames;i++){
					if(POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].frame == Number(document.getElementById("tiledObjectFrame").options[i].value)){
						document.getElementById("tiledObjectFrame").selectedIndex  = i;
					}
				}
				document.getElementById("tiledObjectLayer").selectedIndex = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer;
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("tiledObjectName").focus();
				},10);
			}
			break;	
		case "addSprite":
			var html = '<div id="popUpContent">';
			html += '<h2>Sprite Name:</h2><br><input type="text" id="spriteName" value="" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
			html += '<div><h2>Position:</h2><br><span >x:</span><input type="text" id="x" value="0" style="width:40px;"><span > y:</span><input type="text" id="y" value="0" style="width:40px;"></div>';
			html += '<hr style="width:380px;">';
			html += '<h2>Sprite Sheet:</h2><br><select id="spriteSheet" style="width:380px;" onchange="PE.scene_assets_sprites_changeSheet()">';
			html += '<option>None</option>';
			var numspriteSheets = POLE.spriteSheets.length;
			for(var i=0;i<numspriteSheets;i++){
				html += '<option>'+POLE.spriteSheets[i].name+'</option>';
			}
			html += '</select>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Animation:</h2><br><select id="spriteAnimation" style="width:380px;" onchange="PE.scene_assets_sprites_changeAnimation()">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Frame Number:</h2><br><select id="spriteFrame" style="width:100px;" onchange="">';
			html += '<option>None</option>';
			html += '</select>';
			html += '</div>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Layer:</h2><br><select id="spriteLayer" style="width:50px;">';
			var numLayers = POLE.scenes[this.sceneSelected].layers.length;
			for(var i=0;i<numLayers;i++){
				html += '<option>'+i+'</option>';
			}
			html += '</select>';
			html += '</div>';
			
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_assets_sprites_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addDecal";
			document.getElementById("popUp").innerHTML = html;			
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("spriteName").focus();
			},10);
			break;
		case "editSprite":
			var selectedIndex = -1;
			var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
			for(var i=0;i<numSprites;i++){
				if(document.getElementById("spritesInSceneList_"+i).className == "button_selected"){
					selectedIndex = i;
				}
			}
			if(selectedIndex != -1){
				var html = '<div id="popUpContent">';
				html += '<h2>Sprite Name:</h2><br><input type="text" id="spriteName" value="'+POLE.scenes[PE.sceneSelected].sprites[selectedIndex].name+'" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
				html += '<div><h2>Position:</h2><br><span >x:</span><input type="text" id="x" value="'+POLE.scenes[PE.sceneSelected].sprites[selectedIndex].position.x+'" style="width:40px;"><span > y:</span><input type="text" id="y" value="'+POLE.scenes[PE.sceneSelected].sprites[selectedIndex].position.y+'" style="width:40px;"></div>';
				html += '<hr style="width:380px;">';
				html += '<h2>Sprite Sheet:</h2><br><select id="spriteSheet" style="width:380px;" onchange="PE.scene_assets_sprites_changeSheet()">';
				html += '<option>None</option>';
				var numspriteSheets = POLE.spriteSheets.length;
				for(var i=0;i<numspriteSheets;i++){
					html += '<option>'+POLE.spriteSheets[i].name+'</option>';
				}
				html += '</select>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Animation:</h2><br><select id="spriteAnimation" style="width:380px;" onchange="PE.scene_assets_sprites_changeAnimation()">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Frame Number:</h2><br><select id="spriteFrame" style="width:100px;" onchange="">';
				html += '<option>None</option>';
				html += '</select>';
				html += '</div>';
				html += '<div style="margin-top:10px;">';
				html += '<h2>Layer:</h2><br><select id="spriteLayer" style="width:50px;">';
				var numLayers = POLE.scenes[this.sceneSelected].layers.length;
				for(var i=0;i<numLayers;i++){
					html += '<option>'+i+'</option>';
				}
				html += '</select>';
				html += '</div>';
				
				html += '<hr>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.scene_assets_sprites_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';
				
				html += '</div>';
				//end popUpContent
				
				document.getElementById("popUp").className = "editSprite";
				document.getElementById("popUp").innerHTML = html;
			
				document.getElementById("spriteSheet").selectedIndex = POLE.scenes[this.sceneSelected].sprites[selectedIndex].pIndex + 1;
				this.scene_assets_sprites_changeSheet();
				if(POLE.scenes[this.sceneSelected].sprites[selectedIndex].animation == null){
					document.getElementById("spriteAnimation").selectedIndex = 0;
				}else{
					document.getElementById("spriteAnimation").selectedIndex = POLE.scenes[this.sceneSelected].sprites[selectedIndex].animation + 1;
				}
				this.scene_assets_sprites_changeAnimation();
				var numFrames = document.getElementById("spriteFrame").options.length;
				for(var i=0;i<numFrames;i++){
					if(POLE.scenes[this.sceneSelected].sprites[selectedIndex].frame == Number(document.getElementById("spriteFrame").options[i].value)){
						document.getElementById("spriteFrame").selectedIndex = i;
					}
				}
				document.getElementById("spriteLayer").selectedIndex = POLE.scenes[this.sceneSelected].sprites[selectedIndex].layer;
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("spriteName").focus();
				},10);
			}
			break;
		case "addActorToScene":
			var html = '<div id="popUpContent">';
			html += '<div>';
			html += '<h2>Actor Instance Name:</h2><br><input type="text" id="actorInstanceName" value="" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
			html += '<h2>Select Actor:</h2><br><select id="actorInstanceSelect" style="width:380px;" onchange="">';
			var numActors = POLE.actors.length;
			for(var i=0;i<numActors;i++){
				html += '<option>'+POLE.actors[i].name+'</option>';
			}
			html += '</select><hr style="width:380px;">';
			html += '<div><h2>Position:</h2><br><span >x:</span><input type="text" id="positionX" value="0" style="width:40px;" onblur=""><span > y:</span><input type="text" id="positionY" value="0" style="width:40px;" onblur=""><hr style="width:380px;"></div>';
			
			html += '<div><h2>Layer:</h2><br><select id="layerNum" style="width:50px;">';
			var numLayers = POLE.scenes[this.sceneSelected].layers.length;
			for(var i=0;i<numLayers;i++){
				html += '<option>'+i+'</option>';
			}
			html += '</select>';
			html += '<hr></div>';

			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_assets_actors_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';			
			
			html += '</div>';
			//end popUpContent

			document.getElementById("popUp").className = "addActorToScene";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("actorInstanceName").focus();
			},10);
			break;
		case "editActorInScene":
			if(this.actorInSceneSelected != -1){
				var html = '<div id="popUpContent">';
				html += '<div>';
				html += '<h2>Actor Instance Name:</h2><br><input type="text" id="actorInstanceName" value="" style="width:380px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:380px;">';
				html += '<h2>Select Actor:</h2><br><select id="actorInstanceSelect" style="width:380px;" onchange="">';
				var numActors = POLE.actors.length;
				for(var i=0;i<numActors;i++){
					html += '<option>'+POLE.actors[i].name+'</option>';
				}
				html += '</select><hr style="width:380px;">';
				html += '<div><h2>Position:</h2><br><span >x:</span><input type="text" id="positionX" value="0" style="width:40px;" onblur=""><span > y:</span><input type="text" id="positionY" value="0" style="width:40px;" onblur=""><hr style="width:380px;"></div>';
			
				html += '<div><h2>Layer:</h2><br><select id="layerNum" style="width:50px;">';
				var numLayers = POLE.scenes[this.sceneSelected].layers.length;
				for(var i=0;i<numLayers;i++){
					html += '<option>'+i+'</option>';
				}
				html += '</select>';
				html += '<hr></div>';
				
				html += '<div class="okCancelButs">';
				html += '<button onclick="PE.scene_assets_actors_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
				html += '</div>';			
			
				html += '</div>';
				//end popUpContent
			
				document.getElementById("popUp").className = "editActorInScene";
				document.getElementById("popUp").innerHTML = html;
			
				document.getElementById("actorInstanceName").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].name;
				document.getElementById("actorInstanceSelect").selectedIndex = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].pIndex;
				document.getElementById("positionX").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.x;
				document.getElementById("positionY").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.y;
				document.getElementById("layerNum").selectedIndex = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].layer;
				
				setTimeout(function(){
					document.getElementById("popUp").style.width = "400px";
					PE.menus_centerPopUps();
					document.getElementById("popUp").style.visibility = "visible";
					document.getElementById("actorInstanceName").focus();
				},10);
			}
			break;
		//------------------------------------------------------------------
		//END ASSETS	
		
		//BOX 2D
		//------------------------------------------------------------------
		case "addWorldCollider":
			var html = '<div id="popUpContent" style="width:800px;">';
			
			html += '<div id="popUp_leftSide" style="width:260px;">';
			
			html += '<h2>World Collider Name:</h2><br>';
			html += '<input type="text" name="worldColliderName" id="worldColliderName" value="" style="width:260px;" onkeypress="return PE.restrictCharacters(this, event, \'varName\');"><hr style="width:260px;">';
			html += '<h2>Points:</h2><span style="font-size:10px;"> (Minimum of 3)</span><br>';
			html += '<div id="pointsContainer" style="width:250px;">';
			this.numPoints = 4;
			
			if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
				//point 0
				html += '<div id="point_0">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_0_x" value="'+Math.floor((FLAG.Scene.Map.w/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_0_y" value="'+Math.floor((FLAG.Scene.Map.h/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 1
				html += '<div id="point_1">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_1_x" value="'+Math.floor((FLAG.Scene.Map.w/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_1_y" value="'+Math.floor((FLAG.Scene.Map.h/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 2
				html += '<div id="point_2">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_2_x" value="'+Math.floor((FLAG.Scene.Map.w/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_2_y" value="'+Math.floor((FLAG.Scene.Map.h/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 3
				html += '<div id="point_3">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_3_x" value="'+Math.floor((FLAG.Scene.Map.w/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_3_y" value="'+Math.floor((FLAG.Scene.Map.h/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<button onclick="PE.scene_box2d_worldColliders_addPoint()" style="margin-left:5px;">Add</button>';
				html += '<button onclick="PE.scene_box2d_worldColliders_removePoint()">Remove</button>';
				html += '</div>';
			
			}else if(FLAG.Scene.Map.type == "isometric"){
				//point 0
				html += '<div id="point_0">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_0_x" value="'+Math.floor(-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_0_y" value="'+Math.floor((FLAG.Scene.Map.h/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 1
				html += '<div id="point_1">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_1_x" value="'+Math.floor(32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_1_y" value="'+Math.floor((FLAG.Scene.Map.h/2)-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 2
				html += '<div id="point_2">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_2_x" value="'+Math.floor(32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_2_y" value="'+Math.floor((FLAG.Scene.Map.h/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '</div>';
			
				//point 3
				html += '<div id="point_3">';
				html += '<span >x:</span>';
				html += '<input type="text" id="point_3_x" value="'+Math.floor(-32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<span > y:</span>';
				html += '<input type="text" id="point_3_y" value="'+Math.floor((FLAG.Scene.Map.h/2)+32)+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
				html += '<button onclick="PE.scene_box2d_worldColliders_addPoint()" style="margin-left:5px;">Add</button>';
				html += '<button onclick="PE.scene_box2d_worldColliders_removePoint()">Remove</button>';
				html += '</div>';
			}
			
			html += '</div>';
			
			html += '<hr style="width:260px;">';
			html += '<h2>Fixture Definiton:</h2>';
			html += '<div style="display:block;float:left;width:230px;margin-bottom:10px;">';
			html += '<table>';
			html += '<tr>';
			html += '<td><h2>Density:</h2></td><td><input type="text" id="density" value="1" style="width:40px;"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Friction:</h2></td><td><input type="text" id="friction" value="1" style="width:40px;"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Restitution:</h2></td><td><input type="text" id="restitution" value="0" style="width:40px;"></td>';
			html += '</tr>';
			html += '<tr>';
			html += '<td><h2>Filter Group:</h2></td><td><input type="text" id="filterGroup" value="0" style="width:40px;"></td>';
			html += '</tr>';
			html += '</table>';
			html += '</div>';
			html += '<hr style="width:260px;">';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_box2d_worldColliders_add()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';	
			
			html += '</div>';
			//end popUp_leftSide
			
			html += '<div id="popUp_rightSide"  style="width:500px;">';
		
			html += '<h2>World Collider Preview:</h2>';
			html += '<div id="wcPreview_container">';
			html += '<div id="wcPreview">';
			html += '</div>';
			html += '</div>';
		
			html += '</div>';
			//end popUp_rightSide
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "addWorldCollider";
			document.getElementById("popUp").innerHTML = html;
			
			this.scene_box2d_worldColliders_preview();
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "800px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("worldColliderName").focus();
			},10);
			break;
		case "editWorldCollider":
			var selectedIndex = -1;
			var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
			for(var i=0;i<numWC;i++){
				if(document.getElementById("worldColliderList_"+i).className == "button_selected"){
					selectedIndex = i;
				}
			}
			if(selectedIndex != -1){
				if(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].editable == true){
					var html = '<div id="popUpContent" style="width:800px;">';
					
					html += '<div id="popUp_leftSide" style="width:260px;">';
					
					html += '<h2>World Collider Name:</h2><br>';
					html += '<input type="text" name="worldColliderName" id="worldColliderName" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].name+'" style="width:260px;"><hr style="width:260px;">';
					html += '<h2>Points:</h2><span style="font-size:10px;"> (Minimum of 3)</span><br>';
					html += '<div id="pointsContainer" style="width:250px;">';
					this.numPoints = POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points.length;
					for(var p=0;p<this.numPoints;p++){
						html += '<div id="point_'+p+'">';
						html += '<span >x:</span>';
						html += '<input type="text" id="point_'+p+'_x" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].points[p].x+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
						html += '<span > y:</span>';
						html += '<input type="text" id="point_'+p+'_y" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].points[p].y+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
						if(p == this.numPoints-1){
							html += '<button onclick="PE.scene_box2d_worldColliders_addPoint()" style="margin-left:5px;">Add</button>';
							if(p > 2){
								html += '<button onclick="PE.scene_box2d_worldColliders_removePoint()">Remove</button>';
							}
						}
						html += '</div>';
					}
					html += '</div>';
					
					html += '<hr style="width:260px;">';
					html += '<h2>Fixture Definiton:</h2>';
					html += '<div style="display:block;float:left;width:230px;margin-bottom:10px;">';
					html += '<table>';
					html += '<tr>';
					html += '<td><h2>Density:</h2></td><td><input type="text" id="density" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.density+'" style="width:40px;"></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Friction:</h2></td><td><input type="text" id="friction" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.friction+'" style="width:40px;"></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Restitution:</h2></td><td><input type="text" id="restitution" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.restitution+'" style="width:40px;"></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Filter Group:</h2></td><td><input type="text" id="filterGroup" value="'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.filter.groupIndex +'" style="width:40px;"></td>';
					html += '</tr>';
					html += '</table>';
					html += '</div>';
					html += '<hr style="width:260px;">';
					
					html += '<div class="okCancelButs">';
					html += '<button onclick="PE.scene_box2d_worldColliders_edit()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
					html += '</div>';
					
					html += '</div>';
					//end popUp_leftSide
					
					html += '<div id="popUp_rightSide" style="width:500px;">';
				
					html += '<h2>World Collider Preview:</h2>';
					html += '<div id="wcPreview_container">';
					html += '<div id="wcPreview">';
					html += '</div>';
					html += '</div>';
				
					html += '</div>';
					//end popUp_rightSide
					
					html += '</div>';
					//end popUpContent
					
					document.getElementById("popUp").className = "editWorldCollider";
					document.getElementById("popUp").innerHTML = html;
					
					this.scene_box2d_worldColliders_preview();
					
					setTimeout(function(){
						document.getElementById("popUp").style.width = "800px";
						PE.menus_centerPopUps();
						document.getElementById("popUp").style.visibility = "visible";
						document.getElementById("worldColliderName").focus();
					},10);
					
				}else if(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].editable == false){
					var html = '<div id="popUpContent" style="width:800px;">';
					
					html += '<div id="popUp_leftSide" style="width:260px;">';
					
					html += '<h2>World Collider Name:</h2><br>';
					html += '<span style="display:block;width:260px;">'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].name+'</span><hr style="width:260px;">';
					html += '<h2>Points:</h2><span style="font-size:10px;"> (Minimum of 3)</span><br>';
					html += '<div id="pointsContainer" style="width:250px;">';
					this.numPoints = POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points.length;
					for(var p=0;p<this.numPoints;p++){
						html += '<div id="point_'+p+'">';
						html += '<span >x:</span>';
						html += '<span id="point_'+p+'_x" style="display:inline-block; width:40px;">'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].points[p].x+'</span>';
						html += '<span > y:</span>';
						html += '<span id="point_'+p+'_y" style="display:inline-block; width:40px;">'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].points[p].y+'</span>';
						html += '</div>';
					}
					html += '</div>';
					html += '<hr style="width:260px;">';
					
					html += '<h2>Fixture Definiton:</h2>';
					html += '<div style="display:block;float:left;width:230px;margin-bottom:10px;">';
					html += '<table>';
					html += '<tr>';
					html += '<td><h2>Density:</h2></td><td><span >'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.density+'</span></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Friction:</h2></td><td><span >'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.friction+'</span></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Restitution:</h2></td><td><span >'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.restitution+'</span></td>';
					html += '</tr>';
					html += '<tr>';
					html += '<td><h2>Filter Group:</h2></td><td><span >'+POLE.scenes[PE.sceneSelected].worldColliders[selectedIndex].fixDef.filter.groupIndex +'</span></td>';
					html += '</tr>';
					html += '</table>';
					html += '</div>';
					html += '<hr style="width:260px;">';
					
					html += '<div class="okCancelButs">';
					html += '<button onclick="PE.menus_popUps(\'none\')">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button><button onclick="PE.scene_box2d_worldColliders_makeEditable('+selectedIndex+');">Make Editable Copy</button>';
					html += '</div>';
					
					html += '</div>';
					//end popUp_leftSide
					
					html += '<div id="popUp_rightSide"  style="width:500px;">';
				
					html += '<h2>World Collider Preview:</h2>';
					html += '<div id="wcPreview_container">';
					html += '<div id="wcPreview">';
					html += '</div>';
					html += '</div>';
				
					html += '</div>';
					//end popUp_rightSide
					
					html += '</div>';
					//end popUpContent
					
					document.getElementById("popUp").className = "editWorldCollider";
					document.getElementById("popUp").innerHTML = html;
					
					this.scene_box2d_worldColliders_preview();
					
					setTimeout(function(){
						document.getElementById("popUp").style.width = "800px";
						PE.menus_centerPopUps();
						document.getElementById("popUp").style.visibility = "visible";
					},10);
				}
			}
			break;
		case "edit_gravity":
			var html = '<div id="popUpContent">';
			html += '<h2>Gravity:</h2><br><span >x:</span><input type="text" name="gravityX" id="gravityX" value="'+POLE.scenes[PE.sceneSelected].gravity.x+'" style="width:40px;"><span > y:</span><input type="text" name="gravityY" id="gravityY" value="'+POLE.scenes[PE.sceneSelected].gravity.y+'" style="width:40px;"><br>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';
			html += '<button onclick="PE.scene_box2d_gravity()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent
			
			document.getElementById("popUp").className = "edit_gravity";
			document.getElementById("popUp").innerHTML = html;

			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("gravityX").focus();
			},10);
			break;
		//------------------------------------------------------------------
		//END BOX 2D	
		
		//END SCENES
		
		//GAME
		
		//DISPLAY
		//------------------------------------------------------------------
		case "edit_resolution":
			var html = '<div id="popUpContent">';
			html += '<h2>Resolution:</h2><br><span >w:</span><input type="text" id="resW" value="'+POLE.display.w+'" style="width:40px;" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><span > h:</span><input type="text" id="resH" value="'+POLE.display.h+'"style="width:40px;" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><br>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';			
			html += '<button onclick="PE.game_display_resolution()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent			
			
			document.getElementById("popUp").className = "edit_resolution";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("resW").focus();
			},10);
			break;
		case "edit_setFPS":
			var html = '<div id="popUpContent">';
			html += '<h2>Set Frames Per Second:</h2><br><input type="text" id="setFPSset" value="'+POLE.fps.set+'" style="width:40px;" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><br>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';			
			html += '<button onclick="PE.game_fps_setFPS()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent			
			
			document.getElementById("popUp").className = "edit_resolution";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("setFPSset").focus();
			},10);
			break;
		case "edit_spriteFPS":
			var html = '<div id="popUpContent">';
			html += '<h2>Sprite Frames Per Second:</h2><br><input type="text" id="spriteFPSset" value="'+POLE.fps.sprites+'" style="width:40px;" onkeypress="return PE.restrictCharacters(this, event, \'digits\');"><br>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';			
			html += '<button onclick="PE.game_fps_setSpriteFPS()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent			
			
			document.getElementById("popUp").className = "edit_resolution";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("spriteFPSset").focus();
			},10);
			break;
		//------------------------------------------------------------------
		//END DISPLAY
		
		//END GAME
		
		//POLE
		//------------------------------------------------------------------
		case "importJSON":
			var html = '<div id="popUpContent">';
			html += '<h2>Select File:</h2>';
			html += '<input type="file" id="fileToLoad"></input>';
			html += '<hr>';
			html += '<h2>or</h2>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Select from Library:</h2>';
			html += '<select id="poleLibrary" style="width:380px;margin-bottom:10px;">';
			
			var numPOLES = PE.library.length;
			for(var i=0;i<numPOLES;i++){
				html += '<option>'+PE.library[i].name+'</option>';
			}
			html += '</select>';
			html += '</div>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';	
			html += '<button onclick="PE.pole_import()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent		
			
			document.getElementById("popUp").className = "importPOLE";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
			},10);
			break;
		case "exportJSON":
			var html = '<div id="popUpContent">';
			html += '<h2>File Name:</h2><br><input type="text" id="saveFileName" value="POLE" style="width:380px;margin-left:0px;margin-bottom:5px;">';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';	
			html += '<button onclick="PE.pole_export()" id="okAddImage">Ok</button><button onclick="PE.menus_popUps(\'none\')" id="cancelAddImage">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent	
			
			document.getElementById("popUp").className = "exportJSON";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
				document.getElementById("saveFileName").focus();
			},10);
			break;	
		//------------------------------------------------------------------
		//END POLE
		
		//SCRIPT
		//------------------------------------------------------------------
		case "importScript":
			var html = '<div id="popUpContent">';
			html += '<h2>Select File:</h2>';
			html += '<input type="file" id="fileToLoad"></input>';
			html += '<hr>';
			html += '<h2>or</h2>';
			html += '<div style="margin-top:10px;">';
			html += '<h2>Select from Library:</h2>';
			html += '<select id="poleLibrary" style="width:380px;margin-bottom:10px;">';
			
			var numPOLES = poleLibrary.length;
			for(var i=0;i<numPOLES;i++){
				html += '<option>'+poleLibrary[i].name+'</option>';
			}
			html += '</select>';
			html += '</div>';
			html += '<hr>';
			
			html += '<div class="okCancelButs">';	
			html += '<button onclick="importScript()">Ok</button><button onclick="PE.menus_popUps(\'none\')">Cancel</button>';
			html += '</div>';
			
			html += '</div>';
			//end popUpContent		
			
			document.getElementById("popUp").className = "importScript";
			document.getElementById("popUp").innerHTML = html;
			
			setTimeout(function(){
				document.getElementById("popUp").style.width = "400px";
				PE.menus_centerPopUps();
				document.getElementById("popUp").style.visibility = "visible";
			},10);
			break;
		//------------------------------------------------------------------
		//END SCRIPT
		
		default:
			document.getElementById("popUp").style.width = "400px";
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END MENUS POPUPS


//MENUS SECTION
//Open and close sections of tabbed menus
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_section = function(which){
	var sectionName = which.id.slice(15);
	if(window.getComputedStyle(document.getElementById("section_"+sectionName)).getPropertyValue('height') != "20px"){
		document.getElementById("section_"+sectionName).style.height = "20px";
		which.firstChild.style.backgroundPosition = "-0px -140px";
	}else{
		document.getElementById("section_"+sectionName).style.height = "auto";
		which.firstChild.style.backgroundPosition = "-7px -140px";
	}
	
	//hide menu bar menus
	this.menus_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END MENUS SECTION



//MENUS TABBED
//Control the display of tabbed menus
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_tabbed = function(which){
	document.getElementById("m_assets").style.color = "#333333";
	document.getElementById("m_assets").style.backgroundColor = "#999999";
	document.getElementById("assets").style.visibility = "hidden";
	document.getElementById('assets').style.overflowY = "hidden";
	document.getElementById("m_scene").style.color = "#333333";
	document.getElementById("m_scene").style.backgroundColor = "#999999";
	document.getElementById("scene").style.visibility = "hidden";
	document.getElementById('scene').style.overflowY = "hidden";
	document.getElementById("m_gameSettings").style.color = "#333333";
	document.getElementById("m_gameSettings").style.backgroundColor = "#999999";
	document.getElementById("gameSettings").style.visibility = "hidden";
	document.getElementById('gameSettings').style.overflowY = "hidden";
	document.getElementById("m_info").style.color = "#333333";
	document.getElementById("m_info").style.backgroundColor = "#999999";
	document.getElementById("info").style.visibility = "hidden";
	document.getElementById('info').style.overflowY = "hidden";
	switch(which){
		case "gameSettings":
			document.getElementById("m_gameSettings").style.color = "#666666";
			document.getElementById("m_gameSettings").style.backgroundColor = "#f9f9f9";
			document.getElementById("gameSettings").style.visibility = "inherit";
			document.getElementById('gameSettings').style.overflowY = "auto";
			break;
		case "assets":
			document.getElementById("m_assets").style.color = "#666666";
			document.getElementById("m_assets").style.backgroundColor = "#f9f9f9";
			document.getElementById("assets").style.visibility = "inherit";
			document.getElementById('assets').style.overflowY = "auto";
			break;
			this.assets_tiles_fillList();
		case "scene":
			document.getElementById("m_scene").style.color = "#666666";
			document.getElementById("m_scene").style.backgroundColor = "#f9f9f9";
			document.getElementById("scene").style.visibility = "inherit";
			document.getElementById('scene').style.overflowY = "auto";
			this.scene_layers_fillList();
			break;
		case "info":
			document.getElementById("m_info").style.color = "#666666";
			document.getElementById("m_info").style.backgroundColor = "#f9f9f9";
			document.getElementById("info").style.visibility = "inherit";
			document.getElementById('info').style.overflowY = "auto";
			break;
	}
	
	//hide menu bar menus
	this.menus_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END MENUS TABBED



//MENUS VIEW
//Controls for the view menu
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.menus_view = function(which){
	switch(which){
		case "tools":
			if(window.getComputedStyle(document.getElementById('tools')).getPropertyValue('visibility') == "visible"){
				document.getElementById("tools").style.visibility = "hidden";
				document.getElementById("dDtools").innerHTML = "Show Tools<span class=\'keyCommand\'>&#8679 CTRL 1</span>";
			}else{
				document.getElementById("tools").style.visibility = "visible";
				document.getElementById("dDtools").innerHTML = "Hide Tools<span class=\'keyCommand\'>&#8679 CTRL 1</span>";
			}
			break;
		case "menus":
			if(window.getComputedStyle(document.getElementById('menus')).getPropertyValue('visibility') == "visible"){
				document.getElementById("menus").style.visibility = "hidden";
				document.getElementById('assets').style.overflowY = "hidden";
				document.getElementById('scene').style.overflowY = "hidden";
				document.getElementById('info').style.overflowY = "hidden";
				document.getElementById("dDmenus").innerHTML = "Show Menus<span class=\'keyCommand\'>&#8679 CTRL 2</span>";
			}else{
				document.getElementById("menus").style.visibility = "visible";
				if(window.getComputedStyle(document.getElementById('assets')).getPropertyValue('visibility') == "visible"){
					document.getElementById('assets').style.overflowY = "auto";
				}
				if(window.getComputedStyle(document.getElementById('scene')).getPropertyValue('visibility') == "visible"){
					document.getElementById('scene').style.overflowY = "auto";
				}
				if(window.getComputedStyle(document.getElementById('info')).getPropertyValue('visibility') == "visible"){
					document.getElementById('info').style.overflowY = "auto";
				}
				document.getElementById("dDmenus").innerHTML = "Hide Menus<span class=\'keyCommand\'>&#8679 CTRL 2</span>";
			}
			FLAG.scaleGame();
			break;
		case "json":
			var subMenuObjs = document.getElementsByClassName('subMenu');
			var numsubMenuObjs = subMenuObjs.length;
			if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
				document.getElementById("code_container").style.visibility = "hidden";
				document.getElementById("json").innerHTML = "Show POLE<span class=\'keyCommand\'>&#8679 CTRL 3</span>";
				for(var i=0; i<numsubMenuObjs; i++){
					subMenuObjs[i].style['height'] = (FLAG.h-71).toString()+'px';
				}
			}else{
				this.pole_update_display();
				document.getElementById("code_container").style.visibility = "visible";
				document.getElementById("json").innerHTML = "Hide POLE<span class=\'keyCommand\'>&#8679 CTRL 3</span>";
				for(var i=0; i<numsubMenuObjs; i++){
					subMenuObjs[i].style['height'] = (FLAG.h-271).toString()+'px';
				}
			}
			FLAG.scaleGame();
			break;
		case "grid":
			if(FLAG.Grid.on == true){
				FLAG.Grid.on = false;
				document.getElementById("grid").innerHTML = "Show Grid<span class=\'keyCommand\'>&#8679 CTRL G</span>";
			}else{
				FLAG.Grid.on = true;
				document.getElementById("grid").innerHTML = "Hide Grid<span class=\'keyCommand\'>&#8679 CTRL G</span>";
			}
			break;
		case "walkables":
			if(FLAG.Walkables.on == true){
				FLAG.Walkables.on = false;
				document.getElementById("walkables").innerHTML = "Show Walkables<span class=\'keyCommand\'>&#8679 CTRL W</span>";
			}else{
				FLAG.Walkables.on = true;
				document.getElementById("walkables").innerHTML = "Hide Walkables<span class=\'keyCommand\'>&#8679 CTRL W</span>";
			}
			break;
		case "debugDraw":
			if(FLAG.Box2D.debug == true){
				FLAG.Box2D.debug = false;
				document.getElementById("debugDraw").innerHTML = "Show Box2D<span class=\'keyCommand\'>&#8679 CTRL B</span>";
			}else{
				FLAG.Box2D.debug = true;
				document.getElementById("debugDraw").innerHTML = "Hide Box2D<span class=\'keyCommand\'>&#8679 CTRL B</span>";
			}
			break;
	}
	
	//hide menu bar
	this.menus_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END VIEW MENU VIEW

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END MENUS




//MOUSE
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//MOUSE ON ACTOR PREVIEW
//Checks if the mouse is on the actor preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.mouse_on_actorPreview = function(e){
	var on = false;
	//e.srcElement is for ie
	if((e.target || e.srcElement).id == "actorPreviewImage"){
		on = true;
	}
	return on;
}
//----------------------------------------------------------------------------------------------
//END MOUSE ON ACTOR PREVIEW



//MOUSE ON CANVAS OR GUI
//Checks if the mouse is on the main canvas or the gui div
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.mouse_on_canvasORgui = function(e){
	var clear = false;
	//check for popups
	if(document.getElementById("popUp").className == ""){
		//e.srcElement is for ie
		if((e.target || e.srcElement).id == "gui" || (e.target || e.srcElement).id== "canvas"){
			clear = true;
		}
	}
	return clear;
}
//----------------------------------------------------------------------------------------------
//END MOUSE ON CANVAS OR GUI
 
 
 
//MOUSE ON WORLD COLLIDER PREVIEW
//Checks if the mouse is on the world collider preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.mouse_on_worldColliderPreview = function(e){
	var on = false;
	//e.srcElement is for ie
	if((e.target || e.srcElement).id == "wcPreviewImage"){
		on = true;
	}
	return on;
}
//----------------------------------------------------------------------------------------------
//END MOUSE ON WORLD COLLIDER PREVIEW

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END MOUSE




//POLE 
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//POLE EXPORT
//Exports a javascript file containing the POLE JSON object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_export = function(){
	//this.menus_view("json");
	//var textToWrite = document.getElementById("JSON").innerText;
	
	var textToWrite = "POLE = " + JSON.stringify(POLE);
	
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
		downloadLink.onclick = this.pole_export_removeLink;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
	
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END POLE EXPORT



//POLE EXPORT REMOVE LINK
//Removes a the export link from the DOM in Firefox
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_export_removeLink = function(event){
	document.body.removeChild(event.target);
}
//----------------------------------------------------------------------------------------------
//END POLE EXPORT REMOVE LINK



//POLE IMPORT
//Imports a javascript file containing a POLE JSON object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_import = function(){
	if(document.getElementById("poleLibrary").selectedIndex != 0){
		var fileToLoad = this.library[Number(document.getElementById("poleLibrary").selectedIndex)].url;
		
		this.undo_create();
		
		var txtFile = new XMLHttpRequest();
		txtFile.open("GET", fileToLoad, false);
		txtFile.send();
		eval(txtFile.responseText);
		
		this.pole_load();
		
		
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}else{
		var fileToLoad = document.getElementById("fileToLoad").files[0];
		var fileReader = new FileReader();
		fileReader.onload = function(fileLoadedEvent) 
		{
			PE.undo_create();
		
			var textFromFileLoaded = fileLoadedEvent.target.result;
			eval(textFromFileLoaded);
		
			PE.pole_load();
		
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		};
		fileReader.readAsText(fileToLoad, "UTF-8");
	}
}
//----------------------------------------------------------------------------------------------
//END POLE IMPORT



//POLE LOAD
//Loads the newly imported POLE object for use in the editor and by FLAG
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_load = function(){
	if(this.reloadTimeOut == 0){
		this.reloadTimeOut = 1;
		
		//RESTORE CURRENT LOC and SCALE
		this.mapLoc = {x:FLAG.Scene.Map.x,y:FLAG.Scene.Map.y};
		this.scale = FLAG.Scene.scale;
		
		//CHECK FOR FPS
		//since this was added late
		if(POLE.fps == undefined){
			FLAG.pause();
			POLE.fps = {
				useRAF:true,
				set:30,
				sprites:15
			};
			FLAG.FPS.useRAF = true;
			FLAG.FPS.set = 15;
			FLAG.FPS.sprites = 15;
			FLAG.play();
		}else{
			FLAG.pause();
			FLAG.FPS.useRAF = POLE.fps.useRAF;
			FLAG.FPS.set = POLE.fps.set;
			FLAG.FPS.sprites = POLE.fps.sprites;
			FLAG.play();
		}
		
		this.pole_update_display();
		
		//use FLAG.Tween to fade the whiteGlass
		document.getElementById("whiteGlass").style.visibility = "visible";
		FLAG.Tween(document.getElementById("whiteGlass"),"opacity",1,.5);
		//wait a second for fade to white
		setTimeout(function(){
			FLAG.loadScene(PE.sceneSelected,PE.scene_loaded);
		
			//RESTORE LOC and ZOOM
			FLAG.Scene.Map.x = PE.mapLoc.x;
			FLAG.Scene.Map.y = PE.mapLoc.y;
			FLAG.Scene.scale = PE.scale;
		
			//put the progressBar in the center of the screen
			document.getElementById("progressBar").style.left = ((window.innerWidth/2) - 100) + "px";
			document.getElementById("progressBar").style.top = ((window.innerHeight/2) - 150) + "px";
			document.getElementById("loadProgress").style.width = "0%";
			document.getElementById("progressBar").style.visibility = "visible";
			document.getElementById("loadProgressText").innerHTML = "0%";
			//periodically the showLoadProgress function
			PE.loadInterval = setInterval(function(){PE.scene_loadProgress();},250);
		},750);
	}
}
//----------------------------------------------------------------------------------------------
//END POLE LOAD



//POLE OPEN
//Opens the POLE JSON object in a new browser window
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_open = function(){
	var newWin = window.open('','','');
	newWin.document.write('<title>POLE JSON Object</title>' + document.getElementById("JSON").innerHTML);
	newWin.focus();
}
//----------------------------------------------------------------------------------------------
//END POLE OPEN



//POLE UPDATE DISPLAY
//Updates the POLE JSON object display in the POLE menu
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.pole_update_display = function(){
	//new stuff check
	if(POLE.display.imageBuffer == undefined){
		POLE.display.imageBuffer = false;
	}

	var tab = "&nbsp&nbsp&nbsp&nbsp";
	var html = '<pre>POLE = {<br>';
	var numScenes = POLE.scenes.length;
	for (var key in POLE) {
		switch(key){
			case "display":
				//save until end
				break;
			case "images":
				html += tab + key + ":[<br>";
				var numImages = POLE.images.length;
				for(var i=0;i<numImages;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + POLE.images[i].name + "',<br>";
					html += tab + tab + "url:'" + POLE.images[i].url + "'<br>";
					html += tab + tab + "}";
					if(i != numImages-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "sounds":
				html += tab + key + ":[<br>";
				var numSounds = POLE.sounds.length;
				for(var i=0;i<numSounds;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + POLE.sounds[i].name + "',<br>";
					html += tab + tab + "ogg:'" + POLE.sounds[i].ogg + "',<br>";
					html += tab + tab + "mp3:'" + POLE.sounds[i].mp3 + "'<br>";
					html += tab + tab + "}";
					if(i != numSounds-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "tileSheets":
				html += tab + key + ":[<br>";
				var numTileSheets = POLE.tileSheets.length;
				for(var i=0;i<numTileSheets;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + POLE.tileSheets[i].name + "',<br>";
					html += tab + tab + "image:" + POLE.tileSheets[i].image + ",<br>";
					html += tab + tab + "tileDimensions:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tileSheets[i].tileDimensions.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tileSheets[i].tileDimensions.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "numTiles:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tileSheets[i].numTiles.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tileSheets[i].numTiles.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "origin:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "x:" + POLE.tileSheets[i].origin.x + ",<br>";
					html += tab + tab + tab + "y:" + POLE.tileSheets[i].origin.y + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "animations:[<br>";
					var numAnimations = POLE.tileSheets[i].animations.length;
					for(var a=0;a<numAnimations;a++){
						html += tab + tab + tab + "{<br>";
						html += tab + tab + tab + "name:'" + POLE.tileSheets[i].animations[a].name + "',<br>";
						html += tab + tab + tab + "startFrame:" + POLE.tileSheets[i].animations[a].startFrame + ",<br>";
						html += tab + tab + tab + "endFrame:" + POLE.tileSheets[i].animations[a].endFrame + ",<br>";
						html += tab + tab + tab + "loop:" + POLE.tileSheets[i].animations[a].loop + "<br>"
						html += tab + tab + tab + "}";
						if(a != numAnimations-1){
							html += ",<br>";
						}else{
							html += "<br>";
						}
					}
					html += tab + tab + "]<br>";
					html += tab + tab + "}";
					if(i != numTileSheets-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "tiledObjectSheets":
				html += tab + key + ":[<br>";
				var numTiledObjectSheets = POLE.tiledObjectSheets.length;
				for(var i=0;i<numTiledObjectSheets;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + POLE.tiledObjectSheets[i].name + "',<br>";
					html += tab + tab + "image:" + POLE.tiledObjectSheets[i].image + ",<br>";
					html += tab + tab + "tileDimensions:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tiledObjectSheets[i].tileDimensions.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tiledObjectSheets[i].tileDimensions.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "numTiles:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tiledObjectSheets[i].numTiles.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tiledObjectSheets[i].numTiles.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "origin:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "x:" + POLE.tiledObjectSheets[i].origin.x + ",<br>";
					html += tab + tab + tab + "y:" + POLE.tiledObjectSheets[i].origin.y + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "frameSize:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tiledObjectSheets[i].frameSize.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tiledObjectSheets[i].frameSize.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "numFrames:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.tiledObjectSheets[i].numFrames.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.tiledObjectSheets[i].numFrames.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "animations:[<br>";
					var numAnimations = POLE.tiledObjectSheets[i].animations.length;
					for(var a=0;a<numAnimations;a++){
						html += tab + tab + tab + "{<br>";
						html += tab + tab + tab + "name:'" + POLE.tiledObjectSheets[i].animations[a].name + "',<br>";
						html += tab + tab + tab + "startFrame:" + POLE.tiledObjectSheets[i].animations[a].startFrame + ",<br>";
						html += tab + tab + tab + "endFrame:" + POLE.tiledObjectSheets[i].animations[a].endFrame + ",<br>";
						html += tab + tab + tab + "loop:" + POLE.tiledObjectSheets[i].animations[a].loop + "<br>"
						html += tab + tab + tab + "}";
						if(a != numAnimations-1){
							html += ",<br>";
						}else{
							html += "<br>";
						}
					}
					html += tab + tab + "]<br>";
					html += tab + tab + "}";
					if(i != numTiledObjectSheets-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "spriteSheets":
				html += tab + key + ":[<br>";
				var numSpriteSheets = POLE.spriteSheets.length;
				for(var i=0;i<numSpriteSheets;i++){
					html += tab + tab + "{<br>";
					html += tab + tab + "name:'" + POLE.spriteSheets[i].name + "',<br>";
					html += tab + tab + "image:" + POLE.spriteSheets[i].image + ",<br>";
					html += tab + tab + "tileDimensions:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.spriteSheets[i].tileDimensions.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.spriteSheets[i].tileDimensions.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "numTiles:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "w:" + POLE.spriteSheets[i].numTiles.w + ",<br>";
					html += tab + tab + tab + "h:" + POLE.spriteSheets[i].numTiles.h + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "origin:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "x:" + POLE.spriteSheets[i].origin.x + ",<br>";
					html += tab + tab + tab + "y:" + POLE.spriteSheets[i].origin.y + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "offset:<br>";
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "x:" + POLE.spriteSheets[i].offset.x + ",<br>";
					html += tab + tab + tab + "y:" + POLE.spriteSheets[i].offset.y + "<br>";
					html += tab + tab + tab + "},<br>";
					html += tab + tab + "animations:[<br>";
					var numAnimations = POLE.spriteSheets[i].animations.length;
					for(var a=0;a<numAnimations;a++){
						html += tab + tab + tab + "{<br>";
						html += tab + tab + tab + "name:'" + POLE.spriteSheets[i].animations[a].name + "',<br>";
						html += tab + tab + tab + "startFrame:" + POLE.spriteSheets[i].animations[a].startFrame + ",<br>";
						html += tab + tab + tab + "endFrame:" + POLE.spriteSheets[i].animations[a].endFrame + ",<br>";
						html += tab + tab + tab + "offset:<br>";
						html += tab + tab + tab + tab + "{<br>";
						html += tab + tab + tab + tab + "x:" + POLE.spriteSheets[i].animations[a].offset.x + ",<br>";
						html += tab + tab + tab + tab + "y:" + POLE.spriteSheets[i].animations[a].offset.y + "<br>";
						html += tab + tab + tab + tab + "},<br>";
						html += tab + tab + tab + "loop:" + POLE.spriteSheets[i].animations[a].loop + "<br>"
						html += tab + tab + tab + "}";
						if(a != numAnimations-1){
							html += ",<br>";
						}else{
							html += "<br>";
						}
					}
					html += tab + tab + "]<br>";
					html += tab + tab + "}";
					if(i != numSpriteSheets-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}				
				html += tab + "],<br>";
				break;
			case "actors":
					html += tab + key + ":[<br>";
					var numActors = POLE.actors.length;
					for(var i=0;i<numActors;i++){
						html += tab + tab + "{<br>";
						html += tab + tab + "name:'" + POLE.actors[i].name +"',<br>";
						html += tab + tab + "bodies:[<br>";
						var numBodies = POLE.actors[i].bodies.length;
						for(var b=0;b<numBodies;b++){
							html += tab + tab + tab + "{<br>";
							html += tab + tab + tab + "name:'" + POLE.actors[i].bodies[b].name + "',<br>";
							html += tab + tab + tab + "position:<br>";
							html += tab + tab + tab + tab + "{<br>";
							html += tab + tab + tab + tab + "x:" + POLE.actors[i].bodies[b].position.x + ",<br>";
							html += tab + tab + tab + tab + "y:" + POLE.actors[i].bodies[b].position.y + "<br>";
							html += tab + tab + tab + tab + "},<br>";
							html += tab + tab + tab + "parentBody:"+ POLE.actors[i].bodies[b].parentBody + ",<br>";
							html += tab + tab + tab + "shape:'" + POLE.actors[i].bodies[b].shape + "',<br>";
							html += tab + tab + tab + "shapeDefinition:";
							switch(POLE.actors[i].bodies[b].shape){
								case "box":
									html += "<br>";
									html += tab + tab + tab + tab + "{<br>";
									html += tab + tab + tab + tab + "w:" + POLE.actors[i].bodies[b].shapeDefinition.w + ",<br>";
									html += tab + tab + tab + tab + "h:" + POLE.actors[i].bodies[b].shapeDefinition.h + "<br>";
									html += tab + tab + tab + tab + "},<br>"
									break;
								case "circle":
									html += "<br>";
									html += tab + tab + tab + tab + "{<br>";
									html += tab + tab + tab + tab + "radius:" + POLE.actors[i].bodies[b].shapeDefinition.radius + "<br>";
									html += tab + tab + tab + tab + "},<br>"
									break;
								case "poly":
									html += "[<br>";
									var numPoints = POLE.actors[i].bodies[b].shapeDefinition.length;
									for(var p=0;p<numPoints;p++){
										html += tab + tab + tab + tab + "{<br>";
										html += tab + tab + tab + tab + "x:" + POLE.actors[i].bodies[b].shapeDefinition[p].x + ",<br>";
										html += tab + tab + tab + tab + "y:" + POLE.actors[i].bodies[b].shapeDefinition[p].y + "<br>";
										if(p != numPoints - 1){
											html += tab + tab + tab + tab + "},<br>"
										}else{
											html += tab + tab + tab + tab + "}<br>"
										}
									}
									html += tab + tab + tab + "],<br>"
									break;
								case "tile":
									html += "<br>";
									html += tab + tab + tab + tab + "{<br>";
									html += tab + tab + tab + tab + "w:" + POLE.actors[i].bodies[b].shapeDefinition.w + ",<br>";
									html += tab + tab + tab + tab + "h:" + POLE.actors[i].bodies[b].shapeDefinition.h + "<br>";
									html += tab + tab + tab + tab + "},<br>"
									break;
							}
							html += tab + tab + tab + "type:'" + POLE.actors[i].bodies[b].type + "',<br>";
							html += tab + tab + tab + "fixedRotation:" + POLE.actors[i].bodies[b].fixedRotation + ",<br>";
							html += tab + tab + tab + "fixDef:<br>";
							html += tab + tab + tab + tab + "{<br>";
							html += tab + tab + tab + tab + "density:" + POLE.actors[i].bodies[b].fixDef.density + ",<br>"
							html += tab + tab + tab + tab + "friction:" + POLE.actors[i].bodies[b].fixDef.friction + ",<br>";
							html += tab + tab + tab + tab + "restitution:" + POLE.actors[i].bodies[b].fixDef.restitution + ",<br>";
							html += tab + tab + tab + tab + "filter:<br>";
							html += tab + tab + tab + tab + tab + "{<br>";
							html += tab + tab + tab + tab + tab + "groupIndex:" + POLE.actors[i].bodies[b].fixDef.filter.groupIndex + "<br>";
							html += tab + tab + tab + tab + tab + "}<br>";
							html += tab + tab + tab + tab + "},<br>";
							html += tab + tab + tab + "spriteSheet:" + POLE.actors[i].bodies[b].spriteSheet + ",<br>";
							html += tab + tab + tab + "animation:" + POLE.actors[i].bodies[b].animation + ",<br>";
							html += tab + tab + tab + "frame:" + POLE.actors[i].bodies[b].frame + "<br>";
							html += tab + tab + tab + "}";
							if(b != numBodies-1){
								html += ",<br>";
							}else{
								html += "<br>";
							}
						}
						html += tab + tab + "],<br>";
						html += tab + tab + "joints:[<br>";
						var numJoints = POLE.actors[i].joints.length;
						for(var j=0;j<numJoints;j++){
							html += tab + tab + tab + "{<br>";
							html += tab + tab + tab + "name:'"+ POLE.actors[i].joints[j].name + "',<br>";
							html += tab + tab + tab + "type:'"+ POLE.actors[i].joints[j].type + "',<br>";
							html += tab + tab + tab + "body1:"+ POLE.actors[i].joints[j].body1 + ",<br>";
							html += tab + tab + tab + "body2:"+ POLE.actors[i].joints[j].body2 + ",<br>";
							html += tab + tab + tab + "collideConnected:"+ POLE.actors[i].joints[j].collideConnected + ",<br>";
							switch(POLE.actors[i].joints[j].type){
								case "distance":
									html += tab + tab + tab + "frequencyHz:"+ POLE.actors[i].joints[j].frequencyHz + ",<br>";
									html += tab + tab + tab + "dampingRatio:"+ POLE.actors[i].joints[j].dampingRatio + "<br>";
									break;
								case "revolve":
									html += tab + tab + tab + "motorSpeed:"+ POLE.actors[i].joints[j].motorSpeed + ",<br>";
									html += tab + tab + tab + "maxMotorTorque:"+ POLE.actors[i].joints[j].maxMotorTorque + ",<br>";
									html += tab + tab + tab + "enableMotor:"+ POLE.actors[i].joints[j].enableMotor + ",<br>";
									html += tab + tab + tab + "lowerAngle:"+ POLE.actors[i].joints[j].lowerAngle + ",<br>";
									html += tab + tab + tab + "upperAngle:"+ POLE.actors[i].joints[j].upperAngle + ",<br>";
									html += tab + tab + tab + "enableLimit:"+ POLE.actors[i].joints[j].enableLimit + ",<br>";
									html += tab + tab + tab + "anchor:"+ POLE.actors[i].joints[j].anchor + "<br>";
									break;
							}
							html += tab + tab + tab + "}";
							if(j != numJoints-1){
								html += ",<br>";
							}else{
								html += "<br>";
							}
						}
						html += tab + tab + "]<br>";
						html += tab + tab + "}";
						if(i != numActors-1){
							html += ",<br>";
						}else{
							html += "<br>";
						}
					}
					html += tab + "],<br>";
					break;
		}
	}
	
	html += tab + "scenes:[<br>";	
	for(var s=0;s<numScenes;s++){
		html += tab + tab + "{<br>";
		for (var key in POLE.scenes[s]) {
		switch(key){
			case "name":
			case "type":
			case "bgColor":
			case "audioType":
				html += tab + tab + key + ":'"+POLE.scenes[s][key]+"',<br>";
				break;
			case "bgImage":
				html += tab + tab + key + ":"+POLE.scenes[s][key]+",<br>";
				break;
			case "actors":
				html += tab + tab + key + ":[<br>";
				var numActors = POLE.scenes[s].actors.length;
				for(var a=0;a<numActors;a++){
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "name:'" + POLE.scenes[s].actors[a].name + "',<br>";
					html += tab + tab + tab + "pIndex:" + POLE.scenes[s].actors[a].pIndex + ",<br>";
					html += tab + tab + tab + "position:<br>";
					html += tab + tab + tab + tab + "{<br>";
					html += tab + tab + tab + tab + "x:" + POLE.scenes[s].actors[a].position.x + ",<br>";
					html += tab + tab + tab + tab + "y:" + POLE.scenes[s].actors[a].position.y + "<br>";
					html += tab + tab + tab + tab + "},<br>";
					html += tab + tab + tab + "layer:"+ POLE.scenes[s].actors[a].layer +"<br>";
					html += tab + tab + tab + "}";
					if(a != numActors-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}
				html += tab + tab + "],<br>";
				break;
			case "layers":
				html += tab + tab + key + ":[<br>";
				var numLayers = POLE.scenes[s].layers.length;
				for(var l=0;l<numLayers;l++){
					html += tab + tab + tab + "{<br>";
					for (var key in POLE.scenes[s].layers[l]) {
						switch(key){
							case "tileIDs":
							case "tileSheetIDs":
							case "tiledObjectIDs":
							case "walkableTiles":
								html += tab + tab + tab + key + ":[<br>";
								for(r=0;r<POLE.scenes[s].tilesHigh;r++){
									html += tab + tab + tab + "[";
									for(var c=0;c<POLE.scenes[s].tilesWide;c++){
										 html += POLE.scenes[s].layers[l][key][r][c];
										 if(c != POLE.scenes[s].tilesWide-1){
											  html += ",";
										 }
									}
									html += "]";
									if(r != POLE.scenes[s].tilesHigh-1){
										html += ",";
									}
									html += "<br>";
								}
								html += tab + tab + tab + "],<br>";
								break;
							case "offset":
								//removed
								break;
							case "visible":
								html += tab + tab + tab + key + ":" + POLE.scenes[s].layers[l][key] + ",<br>";
								break;
							case "alpha":
								html += tab + tab + tab + key + ":" + POLE.scenes[s].layers[l][key] + "<br>";
								break;
							default:
								html += tab + tab + tab + key + ":<br>";
								break;
						}
					}
					html += tab + tab + tab + "}";
					if(l != numLayers-1){
						html += ",";
					}
					html += "<br>";
				}
				html += tab + tab + "],<br>"
				break;
			case "resize":
				html += tab + tab + key + ":"+POLE.scenes[s][key]+"<br>";
				break;
			case "walkableTiles":
				html += tab + tab + key + ":[<br>";
				for(r=0;r<POLE.scenes[s].tilesHigh;r++){
					html += tab + tab + "[";
					for(var c=0;c<POLE.scenes[s].tilesWide;c++){
						html += POLE.scenes[s][key][r][c];
						if(c != POLE.scenes[s].tilesWide-1){
							html += ",";
						}
					}
					html += "]";
					if(r != POLE.scenes[s].tilesHigh-1){
						html += ",";
					}
					html += "<br>";
				}
				html += tab + tab + "],<br>";
				break;
			case "tileSprites":
				html += tab + tab + key + ":[<br>";
				var numTileSprites = POLE.scenes[s].tileSprites.length;
				for(var ts=0;ts<numTileSprites;ts++){
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "name:'" + POLE.scenes[s].tileSprites[ts].name +"',<br>";
					html += tab + tab + tab + "pIndex:" + POLE.scenes[s].tileSprites[ts].pIndex +",<br>";
					html += tab + tab + tab + "row:" + POLE.scenes[s].tileSprites[ts].row +",<br>";
					html += tab + tab + tab + "col:" + POLE.scenes[s].tileSprites[ts].col +",<br>";
					html += tab + tab + tab + "animation:" + POLE.scenes[s].tileSprites[ts].animation +",<br>";
					html += tab + tab + tab + "frame:" + POLE.scenes[s].tileSprites[ts].frame +",<br>";
					html += tab + tab + tab + "layer:" + POLE.scenes[s].tileSprites[ts].layer +"<br>";
					html += tab + tab + tab + "}";
					if(ts != numTileSprites-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}
				html += tab + tab + "],<br>";
				break;
			case "tiledObjects":
				html += tab + tab + key + ":[<br>";
				var numTiledObjects = POLE.scenes[s].tiledObjects.length;
				for(var ts=0;ts<numTiledObjects;ts++){
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "name:'" + POLE.scenes[s].tiledObjects[ts].name +"',<br>";
					html += tab + tab + tab + "pIndex:" + POLE.scenes[s].tiledObjects[ts].pIndex +",<br>";
					html += tab + tab + tab + "row:" + POLE.scenes[s].tiledObjects[ts].row +",<br>";
					html += tab + tab + tab + "col:" + POLE.scenes[s].tiledObjects[ts].col +",<br>";
					html += tab + tab + tab + "animation:" + POLE.scenes[s].tiledObjects[ts].animation +",<br>";
					html += tab + tab + tab + "frame:" + POLE.scenes[s].tiledObjects[ts].frame +",<br>";
					html += tab + tab + tab + "layer:" + POLE.scenes[s].tiledObjects[ts].layer +"<br>";
					html += tab + tab + tab + "}";
					if(ts != numTiledObjects-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}
				html += tab + tab + "],<br>";
				break;
			case "sprites":
				html += tab + tab + key + ":[<br>";
				var numSprites = POLE.scenes[s].sprites.length;
				for(var d=0;d<numSprites;d++){
					html += tab + tab + tab + "{<br>";
					html += tab + tab + tab + "name:'" + POLE.scenes[s].sprites[d].name +"',<br>";
					html += tab + tab + tab + "pIndex:" + POLE.scenes[s].sprites[d].pIndex +",<br>";
					html += tab + tab + tab + "position:<br>"
					html += tab + tab + tab + tab + "{<br>"
					html += tab + tab + tab + tab + "x:" + POLE.scenes[s].sprites[d].position.x +",<br>";
					html += tab + tab + tab + tab + "y:" + POLE.scenes[s].sprites[d].position.y +"<br>";
					html += tab + tab + tab + tab + "},<br>"
					html += tab + tab + tab + "animation:" + POLE.scenes[s].sprites[d].animation +",<br>";
					html += tab + tab + tab + "frame:" + POLE.scenes[s].sprites[d].frame +",<br>";
					html += tab + tab + tab + "layer:" + POLE.scenes[s].sprites[d].layer +"<br>";
					html += tab + tab + tab + "}";
					if(ts != numSprites-1){
						html += ",<br>";
					}else{
						html += "<br>";
					}
				}
				html += tab + tab + "],<br>";
				break;
			case "worldColliders":
				html += tab + tab + key + ":[<br>";
				var numWorldColliders = POLE.scenes[s].worldColliders.length;
				for(var wc=0;wc<numWorldColliders;wc++){
					//exclude walkableTileColliders
					if(POLE.scenes[s][key][wc].editable == true){
						html += tab + tab + tab +  "{<br>";
						html += tab + tab + tab +  "name:'"+POLE.scenes[s][key][wc].name+"',<br>";
						html += tab + tab + tab +  "points:[<br>";
						var numPoints = POLE.scenes[s][key][wc].points.length;
						for(var p=0;p<numPoints;p++){
							html += tab + tab + tab + tab + "{x:"+POLE.scenes[s][key][wc].points[p].x+",y:"+POLE.scenes[s][key][wc].points[p].y+"}";
							if(p != numPoints-1){
								html += ",<br>";
							}else{
								html += "<br>";
							}
						}
						html += tab + tab + tab + "],<br>";
						html += tab + tab + tab + "fixDef:<br>";
						html += tab + tab + tab + tab + "{<br>";
						html += tab + tab + tab + tab + "density:" + POLE.scenes[s][key][wc].fixDef.density + ",<br>"
						html += tab + tab + tab + tab + "friction:" + POLE.scenes[s][key][wc].fixDef.friction + ",<br>";
						html += tab + tab + tab + tab + "restitution:" + POLE.scenes[s][key][wc].fixDef.restitution + ",<br>";
						html += tab + tab + tab + tab + "filter:<br>";
						html += tab + tab + tab + tab + tab + "{<br>";
						html += tab + tab + tab + tab + tab + "groupIndex:" + POLE.scenes[s][key][wc].fixDef.filter.groupIndex + "<br>";
						html += tab + tab + tab + tab + tab + "}<br>";
						html += tab + tab + tab + tab + "},<br>";
						html += tab + tab + tab +  "editable:"+POLE.scenes[s][key][wc].editable+"<br>";
						html += tab + tab + tab +  "}";
						if(wc != numWorldColliders-1){
							html += ",";
						}
						html += "<br>";
					}
				}
				html += tab + tab + "],<br>";
				break;
			case "gravity":
				html += tab + tab + key + ":<br>";
				html += tab + tab + tab + "{<br>";
				html += tab + tab + tab + "x:"+POLE.scenes[s][key].x+",<br>";
				html += tab + tab + tab + "y:"+POLE.scenes[s][key].y+"<br>";
				html += tab + tab + tab + "}";
				html += "<br>";
				break;
			default:
				html += tab + tab + key + ":" + POLE.scenes[s][key] + ",<br>";
				break;
		}
	}
		if(s != numScenes-1){
			html += tab + tab + "},<br>";
		}else{
			html += tab + tab + "}<br>";
		}
	}
	
	html += tab + "],<br>";
	
	html += tab + "display:<br>";
	html += tab + tab + "{<br>";
	html += tab + tab + "w:" + POLE.display.w + ",<br>";
	html += tab + tab + "h:" + POLE.display.h + ",<br>";
	html += tab + tab + "fit:'" + POLE.display.fit + "',<br>";
	html += tab + tab + "scale:'" + POLE.display.scale + "',<br>";
	html += tab + tab + "imageSmoothing:" + POLE.display.imageSmoothing + ",<br>";
	html += tab + tab + "imageBuffer:" + POLE.display.imageBuffer + "<br>";
	html += tab + tab + "},<br>";
	html += tab + "fps:<br>";
	html += tab + tab + "{<br>";
	html += tab + tab + "useRAF:" + POLE.fps.useRAF + ",<br>";
	html += tab + tab + "set:" + POLE.fps.set + ",<br>";
	html += tab + tab + "sprites:" + POLE.fps.sprites + "<br>";
	html += tab + tab + "}<br>";
	
	html += '};</pre>';
	document.getElementById("JSON").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END POLE UPDATE DISPLAY

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END POLE




//RESTRICT CHARACTERS
//restricts the characters that can be typed into inputs
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.restrictCharacters = function(myfield, e, restriction){
	
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




//SCENE
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//SCENE ADD
//Adds a new scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_add = function(){   
     var scene = {
        name:'Scene_'+POLE.scenes.length,
        type:POLE.scenes[this.sceneSelected].type,
        tileWidth:POLE.scenes[this.sceneSelected].tileWidth,
        tileHeight:POLE.scenes[this.sceneSelected].tileHeight,
        tilesWide:40,
        tilesHigh:30,
        bgColor:'808080',
        bgImage:null,
        layers:[
            {
            tileIDs:[
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ],
            tileSheetIDs:[
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ],
            tiledObjectIDs:[
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
            ],
            visible:true,
            alpha:1
            }
        ],
        walkableTiles:[
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        tileSprites:[
        ],
        tiledObjects:[
        ],
        sprites:[
        ],
        actors:[
        ],
        useWTC:true,
        worldColliders:[
        ],
        gravity:{x:0,y:0}
        };

	
	POLE.scenes.push(scene);
	this.sceneSelected = POLE.scenes.length-1;
	this.activeLayer = 0;
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE ADD



//SCENE ASSETS ACTORS ADD
//Adds an actor instance to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_actors_add = function(){
	if(document.getElementById("actorInstanceName").value != "" & document.getElementById("actorInstanceSelect").selectedIndex != -1){
		this.undo_create();
		POLE.scenes[this.sceneSelected].actors.push(
		{
			name:document.getElementById("actorInstanceName").value,
			pIndex:Number(document.getElementById("actorInstanceSelect").selectedIndex),
			position:{x:Number(document.getElementById("positionX").value),y:Number(document.getElementById("positionY").value)},
			layer:Number(document.getElementById("layerNum").selectedIndex)
		});
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS ACTORS ADD



//SCENE ASSETS ACTORS EDIT
//Edits an actor instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_actors_edit = function(){
	if(document.getElementById("actorInstanceName").value != "" & document.getElementById("actorInstanceSelect").selectedIndex != -1){
		this.undo_create();
		POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].name = document.getElementById("actorInstanceName").value;
		POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].pIndex = Number(document.getElementById("actorInstanceSelect").selectedIndex);
		POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.x = Number(document.getElementById("positionX").value);
		POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.y = Number(document.getElementById("positionY").value);
		POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].layer = Number(document.getElementById("layerNum").selectedIndex);
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS ACTORS EDIT



//SCENE ASSETS ACTORS REMOVE
//Removes an actor instance from the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_actors_remove = function(){
	if(this.actorInSceneSelected != -1){
		var numActors = POLE.scenes[this.sceneSelected].actors.length;
		var destroyActorName = "";
		var actorsToKeep = [];
		for(var i=0;i<numActors;i++){
			if(document.getElementById("actorsInSceneList_"+i).className == "button_unselected"){
				actorsToKeep.push(POLE.scenes[this.sceneSelected].actors[i]);
			}else{
				destroyActorName = POLE.scenes[this.sceneSelected].actors[i].name;
			}
		}
		this.undo_create();
		POLE.scenes[this.sceneSelected].actors = actorsToKeep;
		actorsToKeep = [];
		this.actorInSceneSelected = -1;
		
		//add actor to scene
		FLAG.removeActor(destroyActorName);
		
		//refresh the editor
		this.pole_update_display();
		this.scene_loaded();
		
		//clear pop ups
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS ACTORS REMOVE



//SCENE ASSETS ACTORS SELECT
//Selects an actor instance from the list in the scene's assets
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_actors_select = function(which){
	var numActors = POLE.scenes[this.sceneSelected].actors.length;
	for(var i=0;i<numActors;i++){
		document.getElementById("actorsInSceneList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var actorNum = which.id.slice(18);
	this.actorInSceneSelected = Number(actorNum);
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editActorInScene"){
		document.getElementById("actorInstanceName").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].name;
		document.getElementById("actorInstanceSelect").selectedIndex = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].pIndex;
		document.getElementById("positionX").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.x;
		document.getElementById("positionY").value = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].position.y;
		document.getElementById("layerNum").selectedIndex = POLE.scenes[this.sceneSelected].actors[this.actorInSceneSelected].layer;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS ACTORS SELECT



//SCENE ASSETS SPRITES ADD
//Adds a sprite instance to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_add = function(){
	if(document.getElementById("spriteName").value != "" && document.getElementById("spriteSheet").selectedIndex > 0){
	
		var whichAnimation = null;
		if(document.getElementById("spriteAnimation").selectedIndex > 0){
			whichAnimation = document.getElementById("spriteAnimation").selectedIndex - 1;
		}
		this.undo_create();
		POLE.scenes[this.sceneSelected].sprites.push({
			name:document.getElementById("spriteName").value,
			pIndex:Number(document.getElementById("spriteSheet").selectedIndex-1),
			position:{x:Number(document.getElementById("x").value),y:Number(document.getElementById("y").value)},			
			animation:whichAnimation,
			frame:Number(document.getElementById("spriteFrame").options[document.getElementById("spriteFrame").selectedIndex].value),
			layer:Number(document.getElementById("spriteLayer").selectedIndex)
		});
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
		
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES ADD



//SCENE ASSETS SPRITES CHANGE ANIMATION
//Changes the animation of a sprite instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_changeAnimation = function(){
	if(document.getElementById("spriteAnimation").selectedIndex <= 0){
		//add all frames from spriteSheet
		var numFrames = Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].numTiles.w) * Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].numTiles.h);
		var html = '';
		var frame = 0;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("spriteFrame").innerHTML = html;
	}else{
		//add only frames of selected animation
		var startFrame = Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].animations[document.getElementById("spriteAnimation").selectedIndex-1].startFrame);
		var endFrame = Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].animations[document.getElementById("spriteAnimation").selectedIndex-1].endFrame);
		var html = '';
		for(var i=startFrame;i<endFrame+1;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("spriteFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES CHANGE ANIMATION



//SCENE ASSETS SPRITES CHANGE SHEET
//Changes the sprite sheet of a sprite instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_changeSheet = function(){
	if(document.getElementById("spriteSheet").selectedIndex <= 0){
		var html = '<option>None</option>';
		document.getElementById("spriteAnimation").innerHTML = html;
		var html = '<option>None</option>';
		document.getElementById("spriteFrame").innerHTML = html;
	}else{
		//add animations of spriteSheet
		var numAnimations = POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].animations.length;
		var html = '<option>None</option>';
		for(var i=0;i<numAnimations;i++){
			html += '<option>'+POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].animations[i].name+'</option>';
		}
		document.getElementById("spriteAnimation").innerHTML = html;
		
		//add all frames from tileSheet
		var numFrames = Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].numTiles.w) * Number(POLE.spriteSheets[document.getElementById("spriteSheet").selectedIndex-1].numTiles.h);
		var html = '';
		var frame = 0;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("spriteFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES CHANGE SHEET




//SCENE ASSETS SPRITES EDIT
//Edits a sprite instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_edit = function(){
	if(document.getElementById("spriteName").value != "" && document.getElementById("spriteSheet").selectedIndex > 0){
	
		var selectedIndex = -1;
		var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
		for(var i=0;i<numSprites;i++){
			if(document.getElementById("spritesInSceneList_"+i).className == "button_selected"){
				selectedIndex = i;
			}
		}
		
		if(selectedIndex != -1){
			var whichAnimation = null;
			if(document.getElementById("spriteAnimation").selectedIndex > 0){
				whichAnimation = document.getElementById("spriteAnimation").selectedIndex - 1;
			}
			this.undo_create();
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].name = document.getElementById("spriteName").value;
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].pIndex = Number(document.getElementById("spriteSheet").selectedIndex-1);
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].position.x = Number(document.getElementById("x").value);
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].position.y = Number(document.getElementById("y").value);			
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].animation = whichAnimation;
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].frame = Number(document.getElementById("spriteFrame").options[document.getElementById("spriteFrame").selectedIndex].value);
			POLE.scenes[this.sceneSelected].sprites[selectedIndex].layer = Number(document.getElementById("spriteLayer").selectedIndex);
		
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES EDIT



//SCENE ASSETS SPRITES REMOVE
//Removes a sprite instance from the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_remove = function(){
	var selectedIndex = -1;
	var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
	for(var i=0;i<numSprites;i++){
		if(document.getElementById("spritesInSceneList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	if(selectedIndex != -1){
		var spritesToKeep = [];
		for(var i=0;i<numSprites;i++){
			if(i != selectedIndex){
				spritesToKeep.push(POLE.scenes[this.sceneSelected].sprites[i]);
			}
		}	
		this.undo_create();
		POLE.scenes[this.sceneSelected].sprites = spritesToKeep;
		spritesToKeep = [];
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES REMOVE



//SCENE ASSETS SPRITES SELECT
//Selects a sprite instance from the scene's assets list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_sprites_select = function(which){
	var numSprites= POLE.scenes[this.sceneSelected].sprites.length;
	for(var i=0;i<numSprites;i++){
		document.getElementById("spritesInSceneList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	var spriteNum = Number(which.id.slice(18));
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editSprite"){
		PE.menus_popUps('editSprite');
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS SPRITES SELECT



//SCENE ASSETS TILE SPRITES ADD
//Add a tile sprite instance to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_add = function(){
	if(document.getElementById("tileSpriteName").value != "" && document.getElementById("tileSpriteTileSheet").selectedIndex > 0 && document.getElementById("tileSpriteAnimation").selectedIndex > 0){
		this.undo_create();
		//clear the tileID and tileSheetIDs
		POLE.scenes[this.sceneSelected].layers[Number(document.getElementById("tileSpriteLayer").selectedIndex)].tileIDs[Number(document.getElementById("row").value)][Number(document.getElementById("col").value)] = 0;
		POLE.scenes[this.sceneSelected].layers[Number(document.getElementById("tileSpriteLayer").selectedIndex)].tileSheetIDs[Number(document.getElementById("row").value)][Number(document.getElementById("col").value)] = 0;
		
		POLE.scenes[this.sceneSelected].tileSprites.push({
			name:document.getElementById("tileSpriteName").value,
			row:Number(document.getElementById("row").value),
			col:Number(document.getElementById("col").value),
			pIndex:Number(document.getElementById("tileSpriteTileSheet").selectedIndex - 1),
			animation:Number(document.getElementById("tileSpriteAnimation").selectedIndex - 1),
			frame:Number(document.getElementById("tileSpriteFrame").options[document.getElementById("tileSpriteFrame").selectedIndex].value),
			layer:Number(document.getElementById("tileSpriteLayer").selectedIndex),
		});
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES ADD



//SCENE ASSETS TILE SPRITES CHANGE ANIMATION
//Changes the animation used by a tile sprite instance in the scene
//tile sprites must have an animation, otherwise they would just be tiles
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_changeAnimation = function(){
	if(document.getElementById("tileSpriteAnimation").selectedIndex <= 0){
		//add all frames from tileSheet
		var numFrames = Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].numTiles.w) * Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].numTiles.h);
		var html = '';
		var frame = 1;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("tileSpriteFrame").innerHTML = html;
	}else{
		//add only frames of selected animation
		var startFrame = Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].animations[document.getElementById("tileSpriteAnimation").selectedIndex-1].startFrame);
		var endFrame = Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].animations[document.getElementById("tileSpriteAnimation").selectedIndex-1].endFrame);
		var html = '';
		for(var i=startFrame;i<endFrame+1;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("tileSpriteFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES CHANGE ANIMATION



//SCENE ASSETS TILE SPRITES CHANGE TILE SHEET
//Changes the tile sheet used by a tile sprite instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_changeTileSheet = function(){
	if(document.getElementById("tileSpriteTileSheet").selectedIndex <= 0){
		var html = '<option>None</option>';
		document.getElementById("tileSpriteAnimation").innerHTML = html;
		var html = '<option>None</option>';
		document.getElementById("tileSpriteFrame").innerHTML = html;
	}else{
		//add animations of tileSheet
		var numAnimations = POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].animations.length;
		var html = '<option>None</option>';
		for(var i=0;i<numAnimations;i++){
			html += '<option>'+POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].animations[i].name+'</option>';
		}
		document.getElementById("tileSpriteAnimation").innerHTML = html;
		
		//add all frames from tileSheet
		var numFrames = Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].numTiles.w) * Number(POLE.tileSheets[document.getElementById("tileSpriteTileSheet").selectedIndex-1].numTiles.h);
		var html = '';
		var frame = 1;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("tileSpriteFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES CHANGE TILE SHEET



//SCENE ASSETS TILE SPRITES EDIT
//Edits a tile sprite instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_edit = function(){
	if(document.getElementById("tileSpriteName").value != "" && document.getElementById("tileSpriteTileSheet").selectedIndex > 0 && document.getElementById("tileSpriteAnimation").selectedIndex > 0){
		var selectedIndex = -1;
		var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
		for(var i=0;i<numTileSprites;i++){
			if(document.getElementById("tileSpriteList_"+i).className == "button_selected"){
				selectedIndex = i;
			}
		}
		
		if(selectedIndex != -1){
			this.undo_create();
			//clear the tileID and tileSheetIDs
			POLE.scenes[this.sceneSelected].layers[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer].tileIDs[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].row][POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].col] = 0;
			POLE.scenes[this.sceneSelected].layers[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer].tileSheetIDs[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].row][POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].col] = 0;

	
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].name = document.getElementById("tileSpriteName").value;
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].row = Number(document.getElementById("row").value);
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].col = Number(document.getElementById("col").value);
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].pIndex = Number(document.getElementById("tileSpriteTileSheet").selectedIndex - 1);
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].animation = Number(document.getElementById("tileSpriteAnimation").selectedIndex - 1);
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].frame= Number(document.getElementById("tileSpriteFrame").options[document.getElementById("tileSpriteFrame").selectedIndex].value);
			POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer = Number(document.getElementById("tileSpriteLayer").selectedIndex);
		
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES EDIT



//SCENE ASSETS TILE SPRITES FILL LIST 
//Fills the list of tile sprites instances that are currently in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_fillList = function(){
	var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
	var html = '';
	for(var ts=0;ts<numTileSprites;ts++){
		html += '<input type="button" class="button_unselected" id="tileSpriteList_'+ts+'" onclick="PE.scene_assets_tileSprites_select(this)" ondblclick="PE.menus_popUps(\'editTileSprite\');" value="'+POLE.scenes[PE.sceneSelected].tileSprites[ts].name+'">';
	}
	document.getElementById("tileSpriteList").innerHTML = html;
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES FILL LIST 



//SCENE ASSETS TILE SPRITES REMOVE
//Removes a tile sprite instance from the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_remove = function(){
	var selectedIndex = -1;
	var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
	for(var i=0;i<numTileSprites;i++){
		if(document.getElementById("tileSpriteList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	
	if(selectedIndex != -1){
		this.undo_create();
		//clear the tileID and tileSheetIDs
		POLE.scenes[this.sceneSelected].layers[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer].tileIDs[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].row][POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].col] = 0;
		POLE.scenes[this.sceneSelected].layers[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].layer].tileSheetIDs[POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].row][POLE.scenes[this.sceneSelected].tileSprites[selectedIndex].col] = 0;

		var tileSpritesToKeep = [];
		for(var i=0;i<numTileSprites;i++){
			if(document.getElementById("tileSpriteList_"+i).className == "button_unselected"){
				tileSpritesToKeep.push(POLE.scenes[this.sceneSelected].tileSprites[i]);
			}
		}	
		POLE.scenes[this.sceneSelected].tileSprites = tileSpritesToKeep;
		tileSpritesToKeep = [];
		
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES REMOVE



//SCENE ASSETS TILE SPRITES SELECT
//Selects a tile sprite instance for the scene's assets list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tileSprites_select = function(which){
	var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
	for(var i=0;i<numTileSprites;i++){
		document.getElementById("tileSpriteList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editTileSprite"){
		PE.menus_popUps('editTileSprite');
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILE SPRITES SELECT



//SCENE ASSETS TILED OBJECTS ADD
//Adds a tiled object instance to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_add = function(){
	if(document.getElementById("tiledObjectName").value != "" && document.getElementById("tiledObjectSheet").selectedIndex > 0){
		
		var numRows = FLAG.Scene.tiledObjectSheets[Number(document.getElementById("tiledObjectSheet").selectedIndex - 1)].rows;
		var numCols = FLAG.Scene.tiledObjectSheets[Number(document.getElementById("tiledObjectSheet").selectedIndex - 1)].cols;
		var row = Number(document.getElementById("row").value);
		var col = Number(document.getElementById("col").value);
		
		
		//check if tiledObject is within bounds of map
		var tiledObjectOutofBounds = false;
		for(var r=0;r<numRows;r++){
			for(var c=0;c<numCols;c++){
				if(row+r >= FLAG.Scene.Map.tilesHigh || col+c >= FLAG.Scene.Map.tilesWide){
					tiledObjectOutofBounds = true;
				}
			}
		}
		
		if(tiledObjectOutofBounds == false){
	
			//check tiledObjectIDs to see if tiledObject already exists
			var tiledObjectExists = false;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					if(FLAG.Scene.layers[Number(document.getElementById("tiledObjectLayer").selectedIndex)].tiledObjectIDs[row+r][col+c] != 0){
						tiledObjectExists = true;
					}
				}
			}
			
			if(tiledObjectExists == false){
				var whichAnimation = null;
				if(document.getElementById("tiledObjectAnimation").selectedIndex != 0){
					whichAnimation = Number(document.getElementById("tiledObjectAnimation").selectedIndex - 1);
				}
				this.undo_create();
				POLE.scenes[this.sceneSelected].tiledObjects.push({
					name:document.getElementById("tiledObjectName").value,
					row:Number(document.getElementById("row").value),
					col:Number(document.getElementById("col").value),
					pIndex:Number(document.getElementById("tiledObjectSheet").selectedIndex - 1),
					animation:whichAnimation,
					frame:Number(document.getElementById("tiledObjectFrame").options[document.getElementById("tiledObjectFrame").selectedIndex].value),
					layer:Number(document.getElementById("tiledObjectLayer").selectedIndex)
				});
								
				this.scene_reload();
				if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
					this.pole_update_display();
				}
				document.getElementById("popUp").className = "";
				document.getElementById("popUp").innerHTML = "";
				document.getElementById("popUp").style.visibility = "hidden";
			}else{
				alert("A TileObject already exists at this location.");
			}
		}else{
			alert("Can not place a TileObject at this location. Some of the tiles would not be on the map.");
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS ADD



//SCENE ASSETS TILED OBJECTS CHANGE ANIMATION
//Changes the animation of a tiled object instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_changeAnimation = function(){
	if(document.getElementById("tiledObjectAnimation").selectedIndex <= 0){
		//add all frames from tileSheet
		var numFrames = Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].numFrames.w) * Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].numFrames.h);
		var html = '';
		var frame = 0;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("tiledObjectFrame").innerHTML = html;
	}else{
		//add only frames of selected animation
		var startFrame = Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].animations[document.getElementById("tiledObjectAnimation").selectedIndex-1].startFrame);
		var endFrame = Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].animations[document.getElementById("tiledObjectAnimation").selectedIndex-1].endFrame);
		var html = '';
		for(var i=startFrame;i<endFrame+1;i++){
			html += '<option>'+i+'</option>';
		}
		document.getElementById("tiledObjectFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS CHANGE ANIMATION



//SCENE ASSETS TILED OBJECTS CHANGE SHEET
//Changes the tiled object sheet of a tiled object instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_changeSheet = function(){
	if(document.getElementById("tiledObjectSheet").selectedIndex <= 0){
		var html = '<option>None</option>';
		document.getElementById("tiledObjectAnimation").innerHTML = html;
		var html = '<option>None</option>';
		document.getElementById("tiledObjectFrame").innerHTML = html;
	}else{
		//add animations of tileSheet
		var numAnimations = POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].animations.length;
		var html = '<option>None</option>';
		for(var i=0;i<numAnimations;i++){
			html += '<option>'+POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].animations[i].name+'</option>';
		}
		document.getElementById("tiledObjectAnimation").innerHTML = html;
		
		//add all frames from tileSheet
		var numFrames = Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].numFrames.w) * Number(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheet").selectedIndex-1].numFrames.h);
		var html = '';
		var frame = 0;
		for(var i=0;i<numFrames;i++){
			html += '<option>'+frame+'</option>';
			frame += 1;
		}
		document.getElementById("tiledObjectFrame").innerHTML = html;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS CHANGE SHEET



//SCENE ASSETS TILED OBJECTS EDIT
//Edits a tiled object instance in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_edit = function(){
	if(document.getElementById("tiledObjectName").value != "" && document.getElementById("tiledObjectSheet").selectedIndex > 0){
	
		var selectedIndex = -1;
		var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
		for(var i=0;i<numTiledObjects;i++){
			if(document.getElementById("tiledObjectsList_"+i).className == "button_selected"){
				selectedIndex = i;
			}
		}
		
		
		
		if(selectedIndex != -1){
			var numRows = FLAG.Scene.tiledObjectSheets[Number(document.getElementById("tiledObjectSheet").selectedIndex - 1)].rows;
			var numCols = FLAG.Scene.tiledObjectSheets[Number(document.getElementById("tiledObjectSheet").selectedIndex - 1)].cols;
			var row = Number(document.getElementById("row").value);
			var col = Number(document.getElementById("col").value);		
		
			//check if tiledObject is within bounds of map
			var tiledObjectOutofBounds = false;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					if(row+r >= FLAG.Scene.Map.tilesHigh || col+c >= FLAG.Scene.Map.tilesWide){
						tiledObjectOutofBounds = true;
					}
				}
			}
		
			if(tiledObjectOutofBounds == false){
				this.undo_create();
				//remove old tiled object from arrays
				var numRows = FLAG.Scene.tiledObjectSheets[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex].rows;
				var numCols = FLAG.Scene.tiledObjectSheets[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex].cols;
				var row = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].row;
				var col = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].col;
				for(var r=0;r<numRows;r++){
					for(var c=0;c<numCols;c++){					
						FLAG.Scene.layers[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer].tileIDs[row+r][col+c] = 0;
						FLAG.Scene.layers[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer].tiledObjectIDs[row+r][col+c] = 0;
					}
				}
		
				var whichAnimation = null;
				if(document.getElementById("tiledObjectAnimation").selectedIndex != 0){
					whichAnimation = Number(document.getElementById("tiledObjectAnimation").selectedIndex - 1);
				}
			
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].name = document.getElementById("tiledObjectName").value;
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].row = Number(document.getElementById("row").value);
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].col = Number(document.getElementById("col").value);
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex = Number(document.getElementById("tiledObjectSheet").selectedIndex - 1);
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].animation = whichAnimation;
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].frame = Number(document.getElementById("tiledObjectFrame").options[document.getElementById("tiledObjectFrame").selectedIndex].value);
				POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer = Number(document.getElementById("tiledObjectLayer").selectedIndex);
		
		
				this.scene_reload();
				if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
					this.pole_update_display();
				}
				document.getElementById("popUp").className = "";
				document.getElementById("popUp").innerHTML = "";
				document.getElementById("popUp").style.visibility = "hidden";
			
			}else{
				alert("Can not move the TileObject to this location. Some of the tiles would not be on the map.");
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS EDIT



//SCENE ASSETS TILED OBJECTS REMOVE
//Removes a tiled object instance from the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_remove = function(){
	var selectedIndex = -1;
	var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
	for(var i=0;i<numTiledObjects;i++){
		if(document.getElementById("tiledObjectsList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	
	if(selectedIndex != -1){
		this.undo_create();
		//remove old tiled object from arrays
		var numRows = FLAG.Scene.tiledObjectSheets[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex].rows;
		var numCols = FLAG.Scene.tiledObjectSheets[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].pIndex].cols;
		var row = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].row;
		var col = POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].col;
		for(var r=0;r<numRows;r++){
			for(var c=0;c<numCols;c++){
				FLAG.Scene.layers[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer].tileIDs[row+r][col+c] = 0;
				FLAG.Scene.layers[POLE.scenes[this.sceneSelected].tiledObjects[selectedIndex].layer].tiledObjectIDs[row+r][col+c] = 0;
			}
		}
	
		var tiledObjectsToKeep = [];
		for(var i=0;i<numTiledObjects;i++){
			if(document.getElementById("tiledObjectsList_"+i).className == "button_unselected"){
				tiledObjectsToKeep.push(POLE.scenes[this.sceneSelected].tiledObjects[i]);
			}
		}	
		POLE.scenes[this.sceneSelected].tiledObjects = tiledObjectsToKeep;
		tiledObjectsToKeep = [];
		
		this.scene_reload();
		if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
			this.pole_update_display();
		}
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS REMOVE



//SCENE ASSETS TILED OBJECTS SELECT
//Select a tiled object instance from the list of scene assets
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_assets_tiledObjects_select = function(which){
	var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
	for(var i=0;i<numTiledObjects;i++){
		document.getElementById("tiledObjectsList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editTiledObject"){
		PE.menus_popUps('editTiledObject');
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE ASSETS TILED OBJECTS SELECT



//SCENE BOX2D GRAVITY
//Edit the gravity of the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_gravity = function(){
	this.undo_create();
	if(isNaN(document.getElementById("gravityX").value) == true){
		POLE.scenes[this.sceneSelected].gravity.x = 0;
	}else{
		POLE.scenes[this.sceneSelected].gravity.x = Number(document.getElementById("gravityX").value);
	}
	if(isNaN(document.getElementById("gravityY").value) == true){
		POLE.scenes[this.sceneSelected].gravity.y = 0;
	}else{
		POLE.scenes[this.sceneSelected].gravity.y = Number(document.getElementById("gravityY").value);
	}
	
	document.getElementById("box2d_gravityX").innerHTML = POLE.scenes[this.sceneSelected].gravity.x;
	document.getElementById("box2d_gravityY").innerHTML = POLE.scenes[this.sceneSelected].gravity.y;
	FLAG.Scene.gravity.x = POLE.scenes[this.sceneSelected].gravity.x;
	FLAG.Scene.gravity.y = POLE.scenes[this.sceneSelected].gravity.y;
	FLAG.Box2D.world.SetGravity(FLAG.Scene.gravity);
	if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
		this.pole_update_display();
	}
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D GRAVITY



//SCENE BOX2D WORLD COLLIDERS ADD
//Add a new world collider to the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_add = function(){

	//gather point values
	var points = [];
	for(var p=0;p<this.numPoints;p++){
		var x = Number(document.getElementById("point_"+p+"_x").value);
		var y = Number(document.getElementById("point_"+p+"_y").value);
		points.push({x:x,y:y});
	}

	var wcShapeValid = true;
	//make sure this is a valid poly 
	if(Box2DSeparator.validate(points) != 0){
		wcShapeValid = false;
	}
	
	if(wcShapeValid == true){
		if(document.getElementById("worldColliderName").value != ""){
		
			this.undo_create();
			POLE.scenes[this.sceneSelected].worldColliders.push({
				name:document.getElementById("worldColliderName").value,
				points:points,
				fixDef:{
					density:Number(document.getElementById("density").value),
					friction:Number(document.getElementById("friction").value),
					restitution:Number(document.getElementById("restitution").value),
					filter:{groupIndex:Number(document.getElementById("filterGroup").value)}
				},
				editable:true
				});
		
			this.scene_reload();
			document.getElementById("popUp").className = "";
			document.getElementById("popUp").innerHTML = "";
			document.getElementById("popUp").style.visibility = "hidden";
		}	
	}else{
		alert("The shape of the World Collider is an invalid polygon. Make sure the points are in clockwise order.");
	}	
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS ADD



//SCENE BOX2D WORLD COLLIDERS ADD POINT
//Adds a point to the world collider shape
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_addPoint = function(){
	//gather point values
	var points = [];
	for(var p=0;p<this.numPoints;p++){
		var x = Number(document.getElementById("point_"+p+"_x").value);
		var y = Number(document.getElementById("point_"+p+"_y").value);
		points.push({x:x,y:y});
	}
	this.numPoints += 1;
	//refill html
	var html = '';
	for(var p=0;p<this.numPoints;p++){
		if(p == this.numPoints-1){
			//find mid point between last and first point
			var midpoint = {x:0,y:0};
			midpoint.x = Math.floor((points[0].x+points[this.numPoints-2].x)/2);
			midpoint.y = Math.floor((points[0].y+points[this.numPoints-2].y)/2);
		
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+midpoint.x+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+midpoint.y+'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
			html += '<button onclick="PE.scene_box2d_worldColliders_addPoint()" style="margin-left:5px;">Add</button>';
			html += '<button onclick="PE.scene_box2d_worldColliders_removePoint()">Remove</button>';
		}else{
			html += '<div id="point_'+p+'">';
			html += '<span >x:</span>';
			html += '<input type="text" id="point_'+p+'_x" value="'+ points[p].x +'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
			html += '<span > y:</span>';
			html += '<input type="text" id="point_'+p+'_y" value="'+ points[p].y +'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
		}
		html += '</div>';
	}
	document.getElementById("pointsContainer").innerHTML = html;
	
	this.scene_box2d_worldColliders_preview();
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS ADD POINT



//SCENE BOX2D WORLD COLLIDERS COPY
//Makes a copy of a world collider
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_copy = function(){
	var selectedIndex = -1;
	var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
	for(var i=0;i<numWC;i++){
		if(document.getElementById("worldColliderList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	if(selectedIndex != -1){
		this.scene_box2d_worldColliders_makeEditable(selectedIndex);
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS COPY



//SCENE BOX2D WORLD COLLIDERS EDIT
//Edit a world collider in the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_edit = function(){
	//gather point values
	var points = [];
	for(var p=0;p<this.numPoints;p++){
		var x = Number(document.getElementById("point_"+p+"_x").value);
		var y = Number(document.getElementById("point_"+p+"_y").value);
		points.push({x:x,y:y});
	}

	var wcShapeValid = true;
	//make sure this is a valid poly 
	if(Box2DSeparator.validate(points) != 0){
		wcShapeValid = false;
	}
	
	if(wcShapeValid == true){
		var selectedIndex = -1;
		var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
		for(var i=0;i<numWC;i++){
			if(document.getElementById("worldColliderList_"+i).className == "button_selected"){
				selectedIndex = i;
			}
		}
		if(selectedIndex != -1){
			if(document.getElementById("worldColliderName").value != ""){
			
				this.undo_create();
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].name = document.getElementById("worldColliderName").value;
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points = points;
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.density = Number(document.getElementById("density").value);
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.friction = Number(document.getElementById("friction").value);
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.restitution = Number(document.getElementById("restitution").value);
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.filter.groupIndex = Number(document.getElementById("filterGroup").value);
				POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].editable = true;
			
		
				this.scene_reload();
				document.getElementById("popUp").className = "";
				document.getElementById("popUp").innerHTML = "";
				document.getElementById("popUp").style.visibility = "hidden";
			}		
		}
	}else{
		alert("The shape of the World Collider is an invalid polygon. Make sure the points are in clockwise order.");
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS EDIT



//SCENE BOX2D WORLD COLLIDERS MAKE EDITABLE
//Makes a world collider editable
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_makeEditable = function(selectedIndex){	
	//makes a copy of the walkableTile collider for editing
	var points = [];
	var numPoints = POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points.length;
	for(var p=0;p<numPoints;p++){
		var x = Number(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points[p].x);
		var y = Number(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].points[p].y);
		points.push({x:x,y:y});
	}
	this.undo_create();
	POLE.scenes[this.sceneSelected].worldColliders.push({
		name:POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].name +"_copy",
		points:points,
		fixDef:{
			density:POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.density,
			friction:POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.friction,
			restitution:POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.restitution,
			filter:{groupIndex:POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].fixDef.filter.groupIndex}
		},
		editable:true
		});

	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS MAKE EDITABLE



//SCENE BOX2D WORLD COLLIDERS PREVIEW
//Draws a preview of the world collider in the popUp menu
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_preview = function(){
	if(this.animationPreview != null){
		clearInterval(PE.animationPreview);
	}
	
	//check if this collider is editable
	var isEditable = true;
	var selectedIndex = -1;
	var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
	for(var i=0;i<numWC;i++){
		if(document.getElementById("worldColliderList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	if(selectedIndex != -1){
		if(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].editable == false){
			isEditable = false;
		}
	}
	
	//create the canvas
	var sizeOfCanvas = {w:FLAG.Scene.Map.w,h:FLAG.Scene.Map.h};
	document.getElementById("wcPreview").innerHTML = '<canvas id="wcPreviewImage" width='+sizeOfCanvas.w+'px height='+sizeOfCanvas.h+'px ></canvas>';	
	var c=document.getElementById("wcPreviewImage");
	var ctx=c.getContext("2d");
	
	//scroll the canvas so that the body selected is in the center of the window
	var windowSize = {w:500,h:500};
	//body position
	var bodyPos = {x:0,y:0};
	//gather point values
	this.controlPoint.polyLoc = [];
	for(var p=0;p<this.numPoints;p++){
		if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
			var x = Number(document.getElementById("point_"+p+"_x").value) || Number(document.getElementById("point_"+p+"_x").innerHTML) || Number(document.getElementById("point_"+p+"_x").innerHTML);
		}else if(FLAG.Scene.Map.type == "isometric"){
			var x = Number(document.getElementById("point_"+p+"_x").value) + (FLAG.Scene.Map.w/2) || Number(document.getElementById("point_"+p+"_x").innerHTML) + (FLAG.Scene.Map.w/2);
		}
		var y = Number(document.getElementById("point_"+p+"_y").value) || Number(document.getElementById("point_"+p+"_y").innerHTML);

		this.controlPoint.polyLoc.push({x:x,y:y});
	}
	//find the middle of the body
	var low = {x:this.controlPoint.polyLoc[0].x,y:this.controlPoint.polyLoc[0].y};
	var high = {x:this.controlPoint.polyLoc[0].x,y:this.controlPoint.polyLoc[0].y};
	for(var p=0;p<this.numPoints;p++){
		if(this.controlPoint.polyLoc[p].x <= low.x){low.x = Number(this.controlPoint.polyLoc[p].x)};
		if(this.controlPoint.polyLoc[p].x >= high.x){high.x = Number(this.controlPoint.polyLoc[p].x)};
		if(this.controlPoint.polyLoc[p].y <= low.y){low.y = Number(this.controlPoint.polyLoc[p].y)};
		if(this.controlPoint.polyLoc[p].y >= high.y){high.y = Number(this.controlPoint.polyLoc[p].y)};
	}
	bodyPos.x = Math.floor((low.x + high.x)/2);
	bodyPos.y = Math.floor((low.y + high.y)/2);

	document.getElementById("wcPreview").scrollLeft = bodyPos.x - (windowSize.w/2);
	document.getElementById("wcPreview").scrollTop = bodyPos.y - (windowSize.h/2);
	
	//get a screen grab of entire scene
	if(this.screenShot == null){
		this.scene_box2d_worldColliders_screenShot();
	}
		
	this.animationPreviewState = "play";
	this.animationPreview = setInterval(function(){
		if(PE.animationPreviewState == "play"){
		
			ctx.save();
			ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
			ctx.restore();
			
			ctx.save();
			
			//draw screenShot
			if(PE.screenShot != null){
				ctx.drawImage(PE.screenShot,0,0);
			}
			
			ctx.strokeStyle = "#000";
			ctx.fillStyle = "#000";
			ctx.lineWidth = 1;
			
			//draw body outline
			ctx.beginPath();
			ctx.moveTo(PE.controlPoint.polyLoc[0].x,PE.controlPoint.polyLoc[0].y);
			for(var p=1;p<PE.numPoints;p++){
				ctx.lineTo(PE.controlPoint.polyLoc[p].x,PE.controlPoint.polyLoc[p].y);
			}
			ctx.closePath();
			ctx.stroke();	
			
			if(isEditable == true){
				//draw control points
				for(var p=0;p<PE.numPoints;p++){
					ctx.beginPath();
					ctx.arc(PE.controlPoint.polyLoc[p].x,PE.controlPoint.polyLoc[p].y,PE.controlPoint.radius,0,2*Math.PI, false);
					ctx.fill();
				}
			}
			
			ctx.restore();
		}
		
	},1000/15);
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS PREVIEW



//SCENE BOX2D WORLD COLLIDERS PREVIEW MOUSE DOWN
//Mouse down controls on the world collider preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_preview_mouseDown = function(e){	
	//check if on any control points
	this.controlPoint.active = false;
	
	//check if this collider is editable
	var isEditable = true;
	var selectedIndex = -1;
	var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
	for(var i=0;i<numWC;i++){
		if(document.getElementById("worldColliderList_"+i).className == "button_selected"){
			selectedIndex = i;
		}
	}
	if(selectedIndex != -1){
		if(POLE.scenes[this.sceneSelected].worldColliders[selectedIndex].editable == false){
			isEditable = false;
		}
	}
	
	if(isEditable == true){
		//pointer position
		var x = FLAG.Pointer.screenLoc.x;
		var y = FLAG.Pointer.screenLoc.y;

		this.controlPoint.polyIndex = null;
		//check all control points in the polygon
		for(var p=0;p<this.numPoints;p++){
			if(FLAG.pointInCircle({x:x,y:y},{x:this.controlPoint.polyLoc[p].x,y:this.controlPoint.polyLoc[p].y},this.controlPoint.radius) == true){
				this.controlPoint.active = true;
				this.controlPoint.polyIndex = p;
			}
		}
	
		if(this.controlPoint.polyIndex != null){
			//adjust display point location
			this.controlPoint.polyLoc[this.controlPoint.polyIndex].x = x;
			this.controlPoint.polyLoc[this.controlPoint.polyIndex].y = y;
			
			//adjust html
			if(FLAG.Scene.Map.type == "isometric"){
				document.getElementById("point_"+PE.controlPoint.polyIndex+"_x").value = Math.floor(x-(FLAG.Scene.Map.w/2));
			}else{
				document.getElementById("point_"+PE.controlPoint.polyIndex+"_x").value = x;
			}
			document.getElementById("point_"+PE.controlPoint.polyIndex+"_y").value = y;
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS PREVIEW MOUSE DOWN



//SCENE BOX2D WORLD COLLIDERS PREVIEW MOUSE MOVE
//Mouse move controls on the world collider preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_preview_mouseMove = function(e){
	//pointer position
	var x = FLAG.Pointer.screenLoc.x;
	var y = FLAG.Pointer.screenLoc.y;

	if(this.controlPoint.active == true){
		//adjust display point location
		this.controlPoint.polyLoc[this.controlPoint.polyIndex].x = x;
		this.controlPoint.polyLoc[this.controlPoint.polyIndex].y = y;
		
		//adjust html
		if(FLAG.Scene.Map.type == "isometric"){
			document.getElementById("point_"+PE.controlPoint.polyIndex+"_x").value = Math.floor(x-(FLAG.Scene.Map.w/2));
		}else{
			document.getElementById("point_"+PE.controlPoint.polyIndex+"_x").value = x;
		}
		document.getElementById("point_"+PE.controlPoint.polyIndex+"_y").value = y;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS PREVIEW MOUSE MOVE



//SCENE BOX2D WORLD COLLIDERS REMOVE
//Remove a world collider from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_remove = function(){
	var numWC = POLE.scenes[this.sceneSelected].worldColliders.length;
	var WCtoKeep = [];
	for(var i=0;i<numWC;i++){
		if(document.getElementById("worldColliderList_"+i).className == "button_unselected" || POLE.scenes[this.sceneSelected].worldColliders[i].editable == false){
			WCtoKeep.push(POLE.scenes[this.sceneSelected].worldColliders[i]);
		}
	}	
	this.undo_create();
	POLE.scenes[this.sceneSelected].worldColliders = WCtoKeep;
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS REMOVE



//SCENE BOX2D WORLD COLLIDERS REMOVE POINT
//Removes a point from the world collider shape
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_removePoint = function(){
	this.numPoints -= 1;
	//gather point values
	var points = [];
	for(var p=0;p<this.numPoints;p++){
		var x = Number(document.getElementById("point_"+p+"_x").value);
		var y = Number(document.getElementById("point_"+p+"_y").value);
		points.push({x:x,y:y});
	}
	//refill html
	var html = '';
	for(var p=0;p<this.numPoints;p++){
		html += '<div id="point_'+p+'">';
		html += '<span >x:</span>';
		html += '<input type="text" id="point_'+p+'_x" value="'+ points[p].x +'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
		html += '<span > y:</span>';
		html += '<input type="text" id="point_'+p+'_y" value="'+ points[p].y +'" style="width:40px;" onblur="PE.scene_box2d_worldColliders_preview()">';
		if(p == this.numPoints-1){
			html += '<button onclick="PE.scene_box2d_worldColliders_addPoint()" style="margin-left:5px;">Add</button>';
			if(p > 2){
				html += '<button onclick="PE.scene_box2d_worldColliders_removePoint()">Remove</button>';
			}
		}
		html += '</div>';
	}
	document.getElementById("pointsContainer").innerHTML = html;
	
	this.scene_box2d_worldColliders_preview();
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS REMOVE POINT



//SCENE BOX2D WORLD COLLIDERS SCREEN SHOT
//Creates a screen shot of the scene to use as a background in the world collider preview canvas
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_screenShot = function(){
	this.screenShot = null;
	//create the canvas
	this.screenShot = document.createElement('canvas');
	this.screenShot.width = FLAG.Scene.Map.w;
	this.screenShot.height = FLAG.Scene.Map.h;
	this.screenShot.ctx = this.screenShot.getContext("2d");
	
	//BACKGROUND COLOR
	this.screenShot.ctx.fillStyle = "#" + FLAG.Scene.bgColor.toString();		
	this.screenShot.ctx.fillRect(0,0,this.screenShot.ctx.canvas.width,this.screenShot.ctx.canvas.height);
	
	var numLayers = FLAG.Scene.layers.length;	
	switch(FLAG.Scene.Map.type){
		case "orthogonal":	
			for(var k=0;k<numLayers;k++){	
				this.screenShot.ctx.save();
				this.screenShot.ctx.setTransform(1,0,0,1,0,0);
				this.screenShot.ctx.restore();
				
				this.screenShot.ctx.save();
				//a translation so the context can be rendered correctly
				var trans = {x:0,y:0};
				trans.x = 0;
				//set the yAdjust to accommodate highest tiled object
				trans.y = 0;
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								if(Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight) < trans.y){
									trans.y = Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight);
								}
							}
						}
					}
				}
			
				//translate the preRender context over the yAdjust
				this.screenShot.ctx.translate(trans.x,-trans.y);
			
				//draw the preRender canvas
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							//check for tile object
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								var point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight)};		
								this.screenShot.ctx.drawImage(FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}else{	
								var rect = FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];	
								var point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y)};		
								this.screenShot.ctx.drawImage(FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}
						}
						
						this.scene_box2d_worldColliders_screenShot_addSprites(i,j,k);
					}
				}
				this.screenShot.ctx.restore();
			}
			break;
		case "isometric":
			for(var k=0;k<numLayers;k++){	
				this.screenShot.ctx.save();
				this.screenShot.ctx.setTransform(1,0,0,1,0,0);
				this.screenShot.ctx.restore();
				
				this.screenShot.ctx.save();
		
				//a translation so the context can be rendered correctly
				var trans = {x:0,y:0};
				//move over half the map width to allow for the negative side of the Grid
				trans.x = FLAG.Scene.Map.w/2;
				//set the yAdjust to accommodate highest tiled object
				trans.y = 0;
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								if(Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight) < trans.y){
									trans.y = Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight);
								}
							}
						}
					}
				}
				
				//translate the preRender context over half the map width and the yAdjust
				this.screenShot.ctx.translate(trans.x,-trans.y);
				
				//draw the preRender canvas
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							//check for tile object
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								var point = {x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x - (FLAG.Scene.Map.tileWidth/2) + FLAG.Scene.layers[k].offset.x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight) + FLAG.Scene.layers[k].offset.y};
								this.screenShot.ctx.drawImage(FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}else{
								var rect = FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];
								var point = {x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x - (FLAG.Scene.Map.tileWidth/2) + FLAG.Scene.layers[k].offset.x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y - rect.h + FLAG.Scene.Map.tileHeight + FLAG.Scene.layers[k].offset.y)};
								this.screenShot.ctx.drawImage(FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}
						}
						
						this.scene_box2d_worldColliders_screenShot_addSprites(i,j,k);
					}
				}
				this.screenShot.ctx.restore();
			}		
			break;
		case "hexagonal":
			for(var k=0;k<numLayers;k++){	
				this.screenShot.ctx.save();
				this.screenShot.ctx.setTransform(1,0,0,1,0,0);
				this.screenShot.ctx.restore();
				
				this.screenShot.ctx.save();
				
				//a translation so the context can be rendered correctly
				var trans = {x:0,y:0};
				trans.x = 0;
				//set the yAdjust to accommodate highest tiled object
				trans.y = 0;
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								if(Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight) < trans.y){
									trans.y = Math.floor(FLAG.Scene.Map.gridPoints[i][j].y-rect.h+FLAG.Scene.Map.tileHeight);
								}
							}
						}
					}
				}
				
				//translate the preRender context over the yAdjust
				this.screenShot.ctx.translate(trans.x,-trans.y);
				
				//draw the preRender canvas
				for(var i=0;i<FLAG.Scene.Map.tilesHigh;i++){
					for(var j=0;j<FLAG.Scene.Map.tilesWide;j++){	
						var tileIDNum = FLAG.Scene.layers[k].tileIDs[i][j];
						if(tileIDNum != 0){
							//check for tile object
							if(FLAG.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
								var rect = FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[FLAG.Scene.tiledObjects[(FLAG.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
								if(	j % 2 != 1){
									var point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y - rect.h + FLAG.Scene.Map.tileHeight)};		
								}else{
									var point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y - rect.h + FLAG.Scene.Map.tileHeight)-(FLAG.Scene.Map.tileHeight/2)};		
								}
								this.screenShot.ctx.drawImage(FLAG.Scene.tiledObjectSheets[FLAG.Scene.tiledObjects[FLAG.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}else{	
								var rect = FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum]
								var point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[i][j].x), y:Math.floor(FLAG.Scene.Map.gridPoints[i][j].y)};	
								this.screenShot.ctx.drawImage(FLAG.Scene.tileSheets[FLAG.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}
						}
						
						this.scene_box2d_worldColliders_screenShot_addSprites(i,j,k);
					}
				}
				
				this.screenShot.ctx.restore();
			}			
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS SCREEN SHOT



//SCENE BOX2D WORLD COLLIDERS SCREEN SHOT ADD SPRITES
//Adds sprites to the screen shot of the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_screenShot_addSprites = function(row,col,layer){
	var numOfSprites = FLAG.Scene.sprites.length;
	for(s=0;s<numOfSprites;s++){
		if(row == FLAG.Scene.sprites[s].tileOn.row && col == FLAG.Scene.sprites[s].tileOn.col){
			if(FLAG.Scene.sprites[s].layer == layer && FLAG.Scene.sprites[s].gui == false && FLAG.Scene.sprites[s].draw == true){
				
				var spritePos = {x:Math.floor(FLAG.Scene.sprites[s].x), y:Math.floor(FLAG.Scene.sprites[s].y)};
				this.screenShot.ctx.save();
				
				//SPRITE DECAL DRAW -- back
				var numOfDecals = FLAG.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(FLAG.Scene.sprites[s].decals[d].front == false){
						var rect = FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].decals[d].pIndex].tileRects[FLAG.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+FLAG.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+FLAG.Scene.sprites[s].decals[d].y)};
						this.screenShot.ctx.globalAlpha = FLAG.Scene.sprites[s].decals[d].alpha;	
						this.screenShot.ctx.drawImage(FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
					}
				}
				
				this.screenShot.ctx.globalAlpha = 1;
				
				//SPRITE DRAW
				var rect = FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].tileRects[FLAG.Scene.sprites[s].frame];	
				var point = {x:Math.floor(FLAG.Scene.sprites[s].x-(rect.w/2)+FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].offset.x), y:Math.floor(FLAG.Scene.sprites[s].y-(rect.h/2)+FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].offset.y)};	
				this.screenShot.ctx.globalAlpha = FLAG.Scene.sprites[s].alpha;	
				if(FLAG.Scene.sprites[s].animation != null){
					var animationOffset = {x:Math.floor(FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].animations[FLAG.Scene.sprites[s].animation].offset.x), y:Math.floor(FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].animations[FLAG.Scene.sprites[s].animation].offset.y)};
					point.x += animationOffset.x;
					point.y += animationOffset.y;
				}
				this.screenShot.ctx.globalAlpha = FLAG.Scene.sprites[s].alpha;
				this.screenShot.ctx.drawImage(FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				
				this.screenShot.ctx.globalAlpha = 1;
				
				//SPRITE DECAL DRAW -- front
				var numOfDecals = FLAG.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(FLAG.Scene.sprites[s].decals[d].front == true){
						var rect = FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].decals[d].pIndex].tileRects[FLAG.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+FLAG.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+FLAG.Scene.sprites[s].decals[d].y)};
						this.screenShot.ctx.globalAlpha = FLAG.Scene.sprites[s].decals[d].alpha;	
						this.screenShot.ctx.drawImage(FLAG.Scene.spriteSheets[FLAG.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
					}
				}
				
				this.screenShot.ctx.restore();
				this.screenShot.ctx.globalAlpha = 1;	
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS SCREEN SHOT ADD SPRITES



//SCENE BOX2D WORLD COLLIDERS SELECT
//Select a world collider from the list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_select = function(which){
	var numColliders = FLAG.Scene.worldColliders.length;
	for(var i=0;i<numColliders;i++){
		document.getElementById("worldColliderList_"+i).className = "button_unselected";
	}
	document.getElementById(which.id).className = "button_selected";
	
	//if edit window is open
	if(document.getElementById("popUp").className == "editWorldCollider"){
		PE.menus_popUps('editWorldCollider');
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS SELECT



//SCENE BOX2D WORLD COLLIDERS USE WALKABLES
//Toggles the use of auto-generated world colliders made by walkable tiles
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_box2d_worldColliders_useWalkables = function(){
	if(document.getElementById("useWTC").checked == true){
		POLE.scenes[this.sceneSelected].useWTC = true;
	}else if(document.getElementById("useWTC").checked == false){
		POLE.scenes[this.sceneSelected].useWTC = false;
	}
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END SCENE BOX2D WORLD COLLIDERS USE WALKABLES



//SCENE FILL LIST
//Fills the scenes list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_fillList = function(){
	var html = "";
	var numScenes = POLE.scenes.length;
	for(var i=0;i<numScenes;i++){
		html += '<option id="scenesList_'+i+'">'+POLE.scenes[i].name+'</option>';
	}
	document.getElementById("scenesList").innerHTML = html;
	document.getElementById("scenesList").selectedIndex = this.sceneSelected;	
}
//----------------------------------------------------------------------------------------------
//END SCENE FILL LIST



//SCENE LAYERS ACTIVATE
//Makes one of the scene's layers the active layer for editing with the tools
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_activate = function(which){
	this.activeLayer = Number(which.id.slice(6));
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS ACTIVATE



//SCENE LAYERS ADD
//Adds a layer to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_add = function(){
	this.undo_create();
	var temp_tileIDs = [];
	var temp_tileSheetIDs = [];
	var temp_tiledObjectIDs = [];
	
	for(var r=0;r<POLE.scenes[this.sceneSelected].tilesHigh;r++){
		var row = [];
		for(var c=0;c<POLE.scenes[this.sceneSelected].tilesWide;c++){
			row.push(0);
		}	
		temp_tileIDs.push(row);	
	}	
	for(var r=0;r<POLE.scenes[this.sceneSelected].tilesHigh;r++){
		var row = [];
		for(var c=0;c<POLE.scenes[this.sceneSelected].tilesWide;c++){
			row.push(0);
		}	
		temp_tileSheetIDs.push(row);	
	}
	for(var r=0;r<POLE.scenes[this.sceneSelected].tilesHigh;r++){
		var row = [];
		for(var c=0;c<POLE.scenes[this.sceneSelected].tilesWide;c++){
			row.push(0);
		}	
		temp_tiledObjectIDs.push(row);	
	}
	
	POLE.scenes[this.sceneSelected].layers.push({tileIDs:temp_tileIDs,tileSheetIDs:temp_tileSheetIDs,tiledObjectIDs:temp_tiledObjectIDs,offset:{x:0,y:0},visible:true,alpha:1});
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS ADD




//SCENE LAYERS ALPHA
//Adjusts the alpha of one of the scene's layers
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_alpha = function(){
	this.undo_create();
	var numLayers = POLE.scenes[this.sceneSelected].layers.length;
	for(var l=0;l<numLayers;l++){
		if(isNaN(document.getElementById("alpha_"+l).value) == true){
			POLE.scenes[this.sceneSelected].layers[l].alpha = 1;
		}else{
			if(document.getElementById("alpha_"+l).value > 1){
				POLE.scenes[this.sceneSelected].layers[l].alpha = 1;
			}else if(document.getElementById("alpha_"+l).value < 0){
				POLE.scenes[this.sceneSelected].layers[l].alpha = 0;
			}else{
				POLE.scenes[this.sceneSelected].layers[l].alpha = document.getElementById("alpha_"+l).value;
			}
		}
	}
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS ALPHA



//SCENE LAYERS FILL LIST
//Fills the scene's layers list
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_fillList = function(){
	var html = "<table>";
	html += '<tr><th style="width:50px;font-size:12px;">Active</th>';
	html += '<th style="width:45px;font-size:12px;">Alpha</th>';
	html += '<th style="width:45px;font-size:12px;">Visible</th>';
	html += '</tr>';
	var numLayers = POLE.scenes[this.sceneSelected].layers.length;
	for(var l=0;l<numLayers;l++){
		
		html +=	'<tr><td><input type="radio" name="layers" value="'+l+'" id="layer_'+l+'" onclick="PE.scene_layers_activate(this)" checked="true"/>'
		html +=	'<label for="layer_'+l+'"><span></span>'+l+'</label></td>';
		html +=	'<td><input type="text" name="" id="alpha_'+l+'" value="'+POLE.scenes[PE.sceneSelected].layers[l].alpha+'" style="width:35px;" onblur="PE.scene_layers_alpha()"></td>';
		html +=	'<td><input type="checkBox" id="layerVisible_'+l+'" onclick="PE.scene_layers_visible()"/>'
		html +=	'<label for="layerVisible_'+l+'"><span></span>'+'</label></td>';
		
		html +=	'</tr>';
	}
	html += "</table>";
	document.getElementById("layerSelect").innerHTML = html;
	
	document.getElementById("layer_"+this.activeLayer).checked = true;
	for(var l=0;l<numLayers;l++){
		if(POLE.scenes[this.sceneSelected].layers[l].visible == true){
			document.getElementById("layerVisible_"+l).checked = true;
		}
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS FILL LIST



//SCENE LAYERS REMOVE
//Removes a layer from the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_remove = function(){
	if(this.activeLayer != 0){
		this.undo_create();
		var keepLayers = [];
		var numLayers = POLE.scenes[this.sceneSelected].layers.length;
		for(var l=0;l<numLayers;l++){
			if(l != this.activeLayer){
				keepLayers.push(POLE.scenes[this.sceneSelected].layers[l]);
			}
		}
		
		//remove any Tile Sprites, Tiled Objects, Sprites or Actors that were on the removed layer
		var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
		var keep = [];
		for(var i=0;i<numTileSprites;i++){
			if(POLE.scenes[this.sceneSelected].tileSprites[i].layer != this.activeLayer){
				keep.push(POLE.scenes[this.sceneSelected].tileSprites[i]);
			}
		}
		POLE.scenes[this.sceneSelected].tileSprites = keep;
		
		var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
		keep = [];
		for(var i=0;i<numTiledObjects;i++){
			if(POLE.scenes[this.sceneSelected].tiledObjects[i].layer != this.activeLayer){
				keep.push(POLE.scenes[this.sceneSelected].tiledObjects[i]);
			}
		}
		POLE.scenes[this.sceneSelected].tiledObjects = keep;
		
		var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
		keep = [];
		for(var i=0;i<numSprites;i++){
			if(POLE.scenes[this.sceneSelected].sprites[i].layer != this.activeLayer){
				keep.push(POLE.scenes[this.sceneSelected].sprites[i]);
			}
		}
		POLE.scenes[this.sceneSelected].sprites = keep;
		
		var numActors = POLE.scenes[this.sceneSelected].actors.length;
		keep = [];
		for(var i=0;i<numActors;i++){
			if(POLE.scenes[this.sceneSelected].actors[i].layer != this.activeLayer){
				keep.push(POLE.scenes[this.sceneSelected].actors[i]);
			}
		}
		POLE.scenes[this.sceneSelected].actors = keep;		
		
		//lower the layer of any Tile Sprites, Tiled Objects, Sprites or Actors that were above the removed layer
		var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
		for(var i=0;i<numTileSprites;i++){
			if(POLE.scenes[this.sceneSelected].tileSprites[i].layer > this.activeLayer){
				POLE.scenes[this.sceneSelected].tileSprites[i].layer -= 1;
			}
		}
		
		var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
		for(var i=0;i<numTiledObjects;i++){
			if(POLE.scenes[this.sceneSelected].tiledObjects[i].layer > this.activeLayer){
				POLE.scenes[this.sceneSelected].tiledObjects[i].layer -= 1;
			}
		}
		
		var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
		for(var i=0;i<numSprites;i++){
			if(POLE.scenes[this.sceneSelected].sprites[i].layer > this.activeLayer){
				POLE.scenes[this.sceneSelected].sprites[i].layer -= 1;
			}
		}
		
		var numActors = POLE.scenes[this.sceneSelected].actors.length;
		for(var i=0;i<numActors;i++){
			if(POLE.scenes[this.sceneSelected].actors[i].layer > this.activeLayer){
				POLE.scenes[this.sceneSelected].actors[i].layer -= 1;
			}
		}		
		
		POLE.scenes[this.sceneSelected].layers = keepLayers;
		this.activeLayer -= 1;
		
		this.scene_reload();
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS REMOVE



//SCENE LAYERS VISIBLE
//Adjusts the visibility of one of the scene's layers
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_layers_visible = function(){
	var numLayers = POLE.scenes[this.sceneSelected].layers.length;
	for(var l=0;l<numLayers;l++){
		if(document.getElementById("layerVisible_"+l).checked == true){
			POLE.scenes[this.sceneSelected].layers[l].visible = true;
		}else{
			POLE.scenes[this.sceneSelected].layers[l].visible = false;
		}
	}
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END SCENE LAYERS VISIBLE



//SCENE LOAD PROGRESS
//periodically update the load progress bar
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_loadProgress = function(){	

	//make bar grow showing load progress
	document.getElementById("loadProgress").style.width = FLAG.sceneLoadProgress+"%";
	document.getElementById("loadProgressText").innerHTML = FLAG.sceneLoadProgress+"%";
	
	//if load is finished
	if(FLAG.sceneLoadProgress == 100){
		clearInterval(PE.loadInterval);
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
//END SCENE LOAD PROGRESS



//SCENE LOADED
//called after scene is loaded
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_loaded = function(){	
	
	//UPDATE EDITOR DISPLAY
	//------------------------------------------------------------------------------------------
	
	//GAME
	document.getElementById('game_Width').innerHTML = POLE.display.w;
	document.getElementById('game_Height').innerHTML = POLE.display.h;
	switch(POLE.display.fit){
		case "static":
			document.getElementById("fit_static").checked = true;
			break;
		case "window":
			document.getElementById("fit_window").checked = true;
			break;
	}
	
	if(POLE.display.scale == 'none'){
		document.getElementById('scale_none').checked = true;
	}else if(POLE.display.scale == 'width'){
		document.getElementById('scale_width').checked = true;
	}else if(POLE.display.scale == 'both'){
		document.getElementById('scale_both').checked = true;
	}else if(POLE.display.scale == 'adapt'){
		document.getElementById('scale_adapt').checked = true;
	}
	
	
	if(POLE.fps.useRAF == true){
		document.getElementById('useRAF').checked = true;
	}else{
		document.getElementById('useRAF').checked = false;
	}	
	document.getElementById('spriteFPS').innerHTML = POLE.fps.sprites;
	document.getElementById('setFPS').innerHTML = POLE.fps.set;
	
	if(POLE.display.imageSmoothing == false){
		document.getElementById('imageSmoothing').checked = false;
	}else{
		document.getElementById('imageSmoothing').checked = true;
	}
	
	if(POLE.display.imageBuffer == undefined || POLE.display.imageBuffer == false){
		document.getElementById('imageBuffer').checked = false;
	}else{
		document.getElementById('imageBuffer').checked = true;
	}
	

	//IMAGES
	//load the images into the gui
	var html = "";
	var numImages = POLE.images.length;
	for(var i=0;i<numImages;i++){
		html += '<input type="button" class="button_unselected" id="imageList_'+i+'" onclick="PE.assets_images_select(this)" ondblclick="PE.assets_images_open(this)" value="'+POLE.images[i].name+'">';
	}
	document.getElementById("imageList").innerHTML = html;
	
	//SOUNDS
	var html = "";
	var numSounds = POLE.sounds.length;
	for(var i=0;i<numSounds;i++){
		html += '<input type="button" class="button_unselected" id="soundList_'+i+'" onclick="PE.assets_sounds_select(this)" ondblclick="PE.assets_sounds_open(this)" value="'+POLE.sounds[i].name+'">';
	}
	document.getElementById("soundList").innerHTML = html;
	
	//TILESHEETS
	//load the tileSheets into the gui
	var html = "";
	var numTileSheets = POLE.tileSheets.length;
	for(var i=0;i<numTileSheets;i++){
		html += '<option id="tileSheetList_'+i+'">'+POLE.tileSheets[i].name+'</option>';
	}
	document.getElementById("tileSheetList").innerHTML = html;
	if(POLE.tileSheets.length > 0 && PE.tileSelected.sheetNum == -1){
		PE.tileSelected.sheetNum = 0;
	}
	document.getElementById("tileSheetList").selectedIndex = PE.tileSelected.sheetNum;
	PE.assets_tiles_fillList();
	PE.assets_tiles_tileSprites_fillList();
	
	//TILED OBJECT SHEETS
	//load the tileObjectdSheets into the gui
	var html = "";
	var numTiledObjectSheets = POLE.tiledObjectSheets.length;
	for(var i=0;i<numTiledObjectSheets;i++){
		html += '<option id="tiledObjectSheetList_'+i+'">'+POLE.tiledObjectSheets[i].name+'</option>';
	}
	document.getElementById("tiledObjectSheetList").innerHTML = html;
	if(POLE.tiledObjectSheets.length > 0 && PE.tiledObjectSheetSelected == -1){
		PE.tiledObjectSheetSelected = 0;
	}
	document.getElementById("tiledObjectSheetList").selectedIndex = PE.tiledObjectSheetSelected;
	PE.assets_tiles_tiledObjects_animation_fillList();
	
	//SPRITESHEETS
	//load the spriteSheets into the gui
	var html = "";
	var numSpriteSheets = POLE.spriteSheets.length;
	for(var i=0;i<numSpriteSheets;i++){
		html += '<option id="spriteSheetList_'+i+'">'+POLE.spriteSheets[i].name+'</option>';
	}
	document.getElementById("spriteSheetList").innerHTML = html;
	if(numSpriteSheets > 0 &&  PE.spriteSheetSelected == -1){
		document.getElementById("spriteSheetList").selectedIndex = 0;
		PE.spriteSheetSelected = 0;
	}else{
		document.getElementById("spriteSheetList").selectedIndex = PE.spriteSheetSelected;
	}
	PE.assets_sprites_animation_fillList();	
	
	
	//ACTORS
	var html = "";
	var numActors = POLE.actors.length;
	for(var i=0;i<numActors;i++){
		if(PE.actorSelected == i){
			html += '<input type="button" class="button_selected" id="actorsList_'+i+'" onclick="PE.assets_actors_select(this)" ondblclick="PE.menus_popUps(\'editActor\');" value="'+POLE.actors[i].name+'">';
		}else{
			html += '<input type="button" class="button_unselected" id="actorsList_'+i+'" onclick="PE.assets_actors_select(this)" ondblclick="PE.menus_popUps(\'editActor\');" value="'+POLE.actors[i].name+'">';
		}
	}
	document.getElementById("actorsList").innerHTML = html;
	
	//SCENES
	var html = "";
	var numScenes = POLE.scenes.length;
	for(var i=0;i<numScenes;i++){
		html += '<option id="scenesList_'+i+'">'+POLE.scenes[i].name+'</option>';
	}
	document.getElementById("scenesList").innerHTML = html;
	document.getElementById("scenesList").selectedIndex = PE.sceneSelected;
	
	//SCENE NAME
	document.getElementById("sceneName").value = POLE.scenes[PE.sceneSelected].name;
	
	//MAP TYPE
	document.getElementById(POLE.scenes[PE.sceneSelected].type).checked = true;
	
	//TILE DIMENSIONS
	document.getElementById("scene_tile_Width").innerHTML = POLE.scenes[PE.sceneSelected].tileWidth;
	document.getElementById("scene_tile_Height").innerHTML = POLE.scenes[PE.sceneSelected].tileHeight;
	
	//MAP DIMENSIONS
	document.getElementById("scene_tiles_Wide").innerHTML = POLE.scenes[PE.sceneSelected].tilesWide;
	document.getElementById("scene_tiles_High").innerHTML = POLE.scenes[PE.sceneSelected].tilesHigh;
	
	//BACKGROUND COLOR
	document.getElementById("bgColor").value =  POLE.scenes[PE.sceneSelected].bgColor;
	document.getElementById("bgColor").style.backgroundColor = "#"+POLE.scenes[PE.sceneSelected].bgColor;
	
	//BACKGROUND IMAGE
	var html = "";
	var numImages = POLE.images.length;
	html += '<option>None</option>';
	for(var i=0;i<numImages;i++){
		html += '<option>'+POLE.images[i].name+'</option>';
	}
	document.getElementById("bgImageList").innerHTML = html;
	if(POLE.scenes[PE.sceneSelected].bgImage == null){
		document.getElementById("bgImageList").selectedIndex = 0;
	}else{
		document.getElementById("bgImageList").selectedIndex = POLE.scenes[PE.sceneSelected].bgImage+1;
	}
	
	//LAYERS
	PE.activeLayer = 0;
	PE.scene_layers_fillList();
	
	//TILE SPRITES
	var numTileSprites = POLE.scenes[PE.sceneSelected].tileSprites.length;
	var html = '';
	for(var ts=0;ts<numTileSprites;ts++){
		html += '<input type="button" class="button_unselected" id="tileSpriteList_'+ts+'" onclick="PE.scene_assets_tileSprites_select(this)" ondblclick="PE.menus_popUps(\'editTileSprite\');" value="'+POLE.scenes[PE.sceneSelected].tileSprites[ts].name+'">';
	}
	document.getElementById("tileSpriteList").innerHTML = html;
	
	//TILED OBJECTS
	var numTiledObjects = POLE.scenes[PE.sceneSelected].tiledObjects.length;
	var html = '';
	for(var ts=0;ts<numTiledObjects;ts++){
		html += '<input type="button" class="button_unselected" id="tiledObjectsList_'+ts+'" onclick="PE.scene_assets_tiledObjects_select(this)" ondblclick="PE.menus_popUps(\'editTiledObject\');" value="'+POLE.scenes[PE.sceneSelected].tiledObjects[ts].name+'">';
	}
	document.getElementById("tiledObjectsList").innerHTML = html;
	
	//SPRITES IN SCENE
	var html = "";
	var numSprites = POLE.scenes[PE.sceneSelected].sprites.length;
	for(var i=0;i<numSprites;i++){
		html += '<input type="button" class="button_unselected" id="spritesInSceneList_'+i+'" onclick="PE.scene_assets_sprites_select(this)" ondblclick="PE.menus_popUps(\'editSprite\');" value="'+POLE.scenes[PE.sceneSelected].sprites[i].name+'">';

	}
	document.getElementById("spritesInSceneList").innerHTML = html;

	//ACTORS IN SCENE
	var html = "";
	var numActors = POLE.scenes[PE.sceneSelected].actors.length;
	for(var i=0;i<numActors;i++){
		html += '<input type="button" class="button_unselected" id="actorsInSceneList_'+i+'" onclick="PE.scene_assets_actors_select(this)" ondblclick="PE.menus_popUps(\'editActorInScene\');" value="'+POLE.scenes[PE.sceneSelected].actors[i].name+'">';

	}
	document.getElementById("actorsInSceneList").innerHTML = html;
	

	//WORLD COLLIDERS
	if(POLE.scenes[PE.sceneSelected].useWTC == true){
		POLE.scenes[PE.sceneSelected].useWTC = true;
		document.getElementById("useWTC").checked = true;
	}else{
		document.getElementById("useWTC").checked = false;
	}
	
	//load the world colliders into the POLE.scenes[PE.sceneSelected] and the gui
	var numWorldColliders = FLAG.Scene.worldColliders.length;
	POLE.scenes[PE.sceneSelected].worldColliders = [];
	for(var i=0;i<numWorldColliders;i++){
		POLE.scenes[PE.sceneSelected].worldColliders.push(FLAG.Scene.worldColliders[i]);
	}
	var html = "";
	var numColliders = POLE.scenes[PE.sceneSelected].worldColliders.length;
	for(var i=0;i<numColliders;i++){
		html += '<input type="button" class="button_unselected" id="worldColliderList_'+i+'" onclick="PE.scene_box2d_worldColliders_select(this)" ondblclick="PE.menus_popUps(\'editWorldCollider\');" value="'+POLE.scenes[PE.sceneSelected].worldColliders[i].name+'">';
	}
	document.getElementById("worldColliderList").innerHTML = html;
	
	//GRAVITY
	document.getElementById("box2d_gravityX").innerHTML = POLE.scenes[PE.sceneSelected].gravity.x;
	document.getElementById("box2d_gravityY").innerHTML = POLE.scenes[PE.sceneSelected].gravity.y;	
	//------------------------------------------------------------------------------------------
	//END UPDATE EDITOR DISPLAY
	
	
	//FLAG SCENE METHODS
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
			PE.menus_centerPopUps();
		}
	}
	
	FLAG.Scene.resize();	
	
	FLAG.Scene.update = function(){
		document.getElementById("fps").innerHTML = FLAG.FPS.now;
		document.getElementById("avgFPS").innerHTML = FLAG.FPS.avg;
		//SEE MOUSE MOVE FOR MOUSE LOCATION INFO
		document.getElementById('sceneScale').innerHTML = (FLAG.Scene.scale*100)+"%";
	}
	
	FLAG.Scene.mouseMove = function(e){				
		FLAG.Cursor.images = null;
		if(PE.mouse_on_canvasORgui(e) == true){
			FLAG.Scene.pointerMoveActions();
		}else{
			FLAG.Cursor.on = false;
			FLAG.Cursor.image = null;
			FLAG.Cursor.images = null;
			FLAG.Scene.dragging = false;
		}
		
		//Actor Canvas 
		if(PE.mouse_on_actorPreview(e) == true){
			PE.assets_actors_preview_mouseMove(e);
		}
		
		//World Collider Canvas 
		if(PE.mouse_on_worldColliderPreview(e) == true){
			PE.scene_box2d_worldColliders_preview_mouseMove(e);
		}
	}
	
	FLAG.Scene.touchMove = function(e){
		
		//if the pointer is on empty space of the gui or on the canvas
		//e.srcElement is for ie
		if((e.target || e.srcElement).id == "gui" || (e.target || e.srcElement).id== "canvas"){
			//prevent mouse action
			e.preventDefault();
		}	
		
		FLAG.Cursor.images = null;
		if(PE.mouse_on_canvasORgui(e) == true){
			FLAG.Scene.pointerMoveActions();
		}else{
			FLAG.Cursor.on = false;
			FLAG.Cursor.image = null;
			FLAG.Cursor.images = null;
			FLAG.Scene.dragging = false;
		}
	}
	
	FLAG.Scene.pointerMoveActions = function(){
		
		FLAG.Cursor.tiles = [{row:FLAG.Pointer.tileOn.row,col:FLAG.Pointer.tileOn.col,color:"#FF0000",width:4}];
		if(FLAG.Pointer.onMap == true){
			if(PE.toolSelected == "draw" || PE.toolSelected == "erase" || PE.toolSelected == "drawTileSprites" || PE.toolSelected == "eraseTileSprites" || PE.toolSelected == "walkables" || PE.toolSelected == "drawTiledObjects" || PE.toolSelected == "eraseTiledObjects"){FLAG.Cursor.on = true;};
		}else{
			FLAG.Cursor.on = false;
		}
		if(PE.toolSelected == "draw" && PE.isDrawing == true){PE.tools_tile_draw();};
		if(PE.toolSelected == "erase" && PE.isDrawing == true){PE.tools_tile_erase();};
		if(PE.toolSelected == "drawTileSprites" && PE.isDrawing == true){PE.tools_tileSprite_draw();};
		if(PE.toolSelected == "eraseTileSprites" && PE.isDrawing == true){PE.tools_tileSprite_erase();};
		document.getElementById("mouseLocX").innerHTML = Math.floor(FLAG.Pointer.mapLoc.x);
		document.getElementById("mouseLocY").innerHTML = Math.floor(FLAG.Pointer.mapLoc.y);
		document.getElementById("mouseRow").innerHTML = FLAG.Pointer.tileOn.row;
		document.getElementById("mouseCol").innerHTML = FLAG.Pointer.tileOn.col;
		
		//draw tile preview
		if(PE.toolSelected == "draw"){
			if(FLAG.Pointer.onMap == true && PE.tileSelected.sheetNum != -1 && PE.tileSelected.tileNum != -1){
				FLAG.Cursor.rect = FLAG.Scene.tileSheets[PE.tileSelected.sheetNum].tileRects[PE.tileSelected.tileNum];
				switch(FLAG.Scene.Map.type){
					case "orthogonal":
						FLAG.Cursor.point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x), y:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y)};
						break;
					case "isometric":
						FLAG.Cursor.point = {x:FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x - (FLAG.Scene.Map.tileWidth/2), y:FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y-FLAG.Cursor.rect.h+FLAG.Scene.Map.tileHeight};
						break;
					case "hexagonal":
						FLAG.Cursor.point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x), y:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y)};
						break;
				}
				FLAG.Cursor.image = FLAG.Scene.tileSheets[PE.tileSelected.sheetNum].image;
			}else{
				FLAG.Cursor.on = false;
				FLAG.Cursor.image = null;
			}
			
		//draw tile sprite preview
		}else if(PE.toolSelected == "drawTileSprites"){
			if(FLAG.Pointer.onMap == true && PE.tileAnimationSelected != -1){
				FLAG.Cursor.rect = FLAG.Scene.tileSheets[PE.tileSelected.sheetNum].tileRects[POLE.tileSheets[PE.tileSelected.sheetNum].animations[PE.tileAnimationSelected].startFrame];
				switch(FLAG.Scene.Map.type){
					case "orthogonal":
						FLAG.Cursor.point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x), y:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y)};
						break;
					case "isometric":
						FLAG.Cursor.point = {x:FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x - (FLAG.Scene.Map.tileWidth/2), y:FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y-FLAG.Cursor.rect.h+FLAG.Scene.Map.tileHeight};
						break;
					case "hexagonal":
						FLAG.Cursor.point =	{x:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].x), y:Math.floor(FLAG.Scene.Map.gridPoints[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col].y)};
						break;
				}
				FLAG.Cursor.image = FLAG.Scene.tileSheets[PE.tileSelected.sheetNum].image;
			}else{
				FLAG.Cursor.on = false;
				FLAG.Cursor.image = null;
			}
			
		//draw tiled objects preview
		}else if(PE.toolSelected == "drawTiledObjects"){
			PE.okToDrawTiledObject = true;
			if(FLAG.Pointer.onMap == true && document.getElementById("tiledObjectSheetList").selectedIndex != -1){
				FLAG.tiledObjectPreview(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].name);
			}else{
				FLAG.Cursor.on = false;
				FLAG.Cursor.image = null;
				PE.okToDrawTiledObject = false;
			}
			
		//erase tiled objects
		}else if(PE.toolSelected == "eraseTiledObjects"){
			PE.okToEraseTiledObject = false;
			if(FLAG.Pointer.onMap == true){
				if(FLAG.Scene.layers[PE.activeLayer].tiledObjectIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] != 0){
					PE.okToEraseTiledObject = true;						
					FLAG.tiledObjectSelect({layer:PE.activeLayer,tilesOn:true,tileColor:"#ff0000"});
				}
			}else{
				FLAG.Cursor.on = false;
			}
			
		//draw actor preview
		}else if(PE.toolSelected == "addActor"){
			if(PE.actorSelected != -1){
				FLAG.Cursor.images = [];
				var numBodies = POLE.actors[PE.actorSelected].bodies.length;
				for(var j=0;j<numBodies;j++){
					var b=POLE.actors[PE.actorSelected].bodies[j];
					if(b.spriteSheet != null){
						var rect = FLAG.Scene.spriteSheets[b.spriteSheet].tileRects[0];
						var point = {x:Math.floor(FLAG.Pointer.mapLoc.x-(rect.w/2)+POLE.spriteSheets[b.spriteSheet].offset.x + b.position.x), y:Math.floor(FLAG.Pointer.mapLoc.y-(rect.h/2)+POLE.spriteSheets[b.spriteSheet].offset.y + b.position.y)};	
						var image = FLAG.Scene.spriteSheets[b.spriteSheet].image;
						FLAG.Cursor.images.push({rect:rect,point:point,image:image});
					}
				}
			}
		//draw Sprite preview
		}else if(PE.toolSelected == "addSprite"){
			if(PE.spriteSheetSelected != -1){
				FLAG.Cursor.rect = FLAG.Scene.spriteSheets[PE.spriteSheetSelected].tileRects[0];
				FLAG.Cursor.point = {x:Math.floor(FLAG.Pointer.mapLoc.x-(FLAG.Cursor.rect.w/2)+POLE.spriteSheets[PE.spriteSheetSelected].offset.x), y:Math.floor(FLAG.Pointer.mapLoc.y-(FLAG.Cursor.rect.h/2)+POLE.spriteSheets[PE.spriteSheetSelected].offset.y)};						
				FLAG.Cursor.image = FLAG.Scene.spriteSheets[PE.spriteSheetSelected].image;
			}
			
		}else if(PE.toolSelected == "selectArrow"){

			if(PE.selected.index != null && PE.selected.type != null && PE.selected.dragging == true){
				switch(PE.selected.type){
					case "actor":
						//actor position
						FLAG.Scene.actors[PE.selected.index].position.x = FLAG.Pointer.mapLoc.x;
						FLAG.Scene.actors[PE.selected.index].position.y = FLAG.Pointer.mapLoc.y;
						//body positions
						var x = FLAG.Pointer.mapLoc.x/FLAG.Box2D.scale;
						var y = FLAG.Pointer.mapLoc.y/FLAG.Box2D.scale;
						var numBodies = FLAG.Scene.actors[PE.selected.index].bodies.length;
						
						var offsets = [];
						for(var b=0;b<numBodies;b++){
							//store the offset of each body from body 0
							var posOffset = {x:0,y:0};
							posOffset.x = FLAG.Scene.actors[PE.selected.index].bodies[0].fb2Body.GetPosition().x - FLAG.Scene.actors[PE.selected.index].bodies[b].fb2Body.GetPosition().x;
							posOffset.y = FLAG.Scene.actors[PE.selected.index].bodies[0].fb2Body.GetPosition().y - FLAG.Scene.actors[PE.selected.index].bodies[b].fb2Body.GetPosition().y;
							offsets.push(posOffset);
						}
	
						//apply position change to all bodies based on body 0
						for(var b=0;b<numBodies;b++){
							FLAG.Scene.actors[PE.selected.index].bodies[b].fb2Body.SetAwake(false);
							FLAG.Scene.actors[PE.selected.index].bodies[b].fb2Body.SetPosition({x:x-offsets[b].x+PE.selected.pAdjust.x,y:y-offsets[b].y+PE.selected.pAdjust.y});
						}
						break;
					case "sprite":
						//sprite position
						FLAG.Scene.sprites[PE.selected.index].x = FLAG.Pointer.mapLoc.x + PE.selected.pAdjust.x;
						FLAG.Scene.sprites[PE.selected.index].y = FLAG.Pointer.mapLoc.y + PE.selected.pAdjust.y;
						break;
				}
			}	
		}
	}
		
	FLAG.Scene.mouseUp = function(e){
		FLAG.Scene.pointerUpActions(e);
	}
	
	FLAG.Scene.touchUp = function(e){
		
		//if the pointer is on empty space of the gui or on the canvas
		//e.srcElement is for ie
		if((e.target || e.srcElement).id == "gui" || (e.target || e.srcElement).id== "canvas"){
			//prevent mouse action
			e.preventDefault();
		}		
	
		FLAG.Scene.pointerUpActions(e);
	}
	
	FLAG.Scene.pointerUpActions = function(e){
		PE.isDrawing = false;
		PE.controlPoint.active = false;
		PE.controlPoint.polyIndex = null;
		FLAG.Scene.dragStop();
		
		
		if(PE.mouse_on_canvasORgui(e) == true){	
			
			//using left mouse button
			if(e.button == 0 || (e.touches != undefined && e.touches.length == 1)){		
			
				if(PE.toolSelected == "drawTiledObjects"){
					PE.tools_tiledObjects_draw();
				}else if(PE.toolSelected == "eraseTiledObjects"){
					PE.tools_tiledObjects_erase();
				}else if(PE.toolSelected == "walkables"){
					PE.tools_walkableTiles_edit();
				}else if(PE.toolSelected == "addActor"){
					PE.tools_actor_add();
				}else if(PE.toolSelected == "addSprite"){
					PE.tools_sprite_add();
				}else if(PE.toolSelected == "zoomIn"){
					if(PE.mouse_on_canvasORgui(e) == true){
						FLAG.zoomIn();
					}
				}else if(PE.toolSelected == "zoomOut"){
					if(PE.mouse_on_canvasORgui(e) == true){
						FLAG.zoomOut();
					}
				}else if(PE.toolSelected == "zeroMap"){
					var x = FLAG.Pointer.screenLoc.x/(FLAG.scale)/(FLAG.Scene.scale);
					var y = FLAG.Pointer.screenLoc.y/(FLAG.scale)/(FLAG.Scene.scale);
					FLAG.Scene.Map.x = x;
					FLAG.Scene.Map.y = y;
				}else if(PE.toolSelected == "selectArrow"){
					if(PE.selected.dragging == true){
						PE.undo_create();
						//if an actor is being dragged
						if(PE.selected.type == "actor"){
							//update the actor's position in POLE
							POLE.scenes[PE.sceneSelected].actors[PE.selected.index].position.x = FLAG.Scene.actors[PE.selected.index].position.x;
							POLE.scenes[PE.sceneSelected].actors[PE.selected.index].position.y = FLAG.Scene.actors[PE.selected.index].position.y;
						
							//set all the bodies to awake to run physics on new positions
							var numActors = FLAG.Scene.actors.length;
							for(var i=0;i<numActors;i++){
								//BODIES
								var numBodies = FLAG.Scene.actors[i].bodies.length;
								for(var j=0;j<numBodies;j++){
									var b = FLAG.Scene.actors[i].bodies[j].fb2Body;
									b.SetAwake(true);
								}
							}
						//if a sprite is being dragged
						}else if(PE.selected.type == "sprite"){
							//update the sprite's position in POLE
							POLE.scenes[PE.sceneSelected].sprites[PE.selected.index].position.x = FLAG.Scene.sprites[PE.selected.index].x;
							POLE.scenes[PE.sceneSelected].sprites[PE.selected.index].position.y = FLAG.Scene.sprites[PE.selected.index].y;
						}
					}
				}
			}
		}
		
		PE.selected.dragging = false;
	}	
	
	
	FLAG.Scene.mouseDown = function(e){
		FLAG.Scene.pointerDownActions(e);
	}
	
	FLAG.Scene.touchDown = function(e){
	
		//if the pointer is on empty space of the gui or on the canvas
		//e.srcElement is for ie
		if((e.target || e.srcElement).id == "gui" || (e.target || e.srcElement).id== "canvas"){
			//prevent mouse action
			e.preventDefault();
		}	
		
		FLAG.Scene.pointerDownActions(e);
	}
	
	FLAG.Scene.pointerDownActions = function(e){
		if(PE.mouse_on_canvasORgui(e) == true){
			
			//using left mouse button
			if(e.button == 0 || (e.touches != undefined && e.touches.length == 1)){	
			
				if(PE.toolSelected == "draw"){
					PE.isDrawing = true;
					PE.tools_tile_draw();	
				}else if(PE.toolSelected == "erase"){
					PE.isDrawing = true;
					PE.tools_tile_erase();
				}else if(PE.toolSelected == "drawTileSprites"){
					PE.isDrawing = true;
					PE.tools_tileSprite_draw();
				}else if(PE.toolSelected == "eraseTileSprites"){
					PE.isDrawing = true;
					PE.tools_tileSprite_erase();
				}else if(PE.toolSelected == "move"){
					FLAG.Scene.dragStart();
				}else if(PE.toolSelected == "selectArrow"){
					//is an actor selected 
					if(FLAG.actorsClicked()[0] != undefined){
						PE.selected.type = "actor";
						PE.selected.index = FLAG.actorsClicked()[0].sIndex;
						PE.selected.dragging = true;
					
						var numActors = FLAG.Scene.actors.length;
						for(var i=0;i<numActors;i++){
							if(i != PE.selected.index){
								//BODIES
								var numBodies = FLAG.Scene.actors[i].bodies.length;
								for(var j=0;j<numBodies;j++){
									var b = FLAG.Scene.actors[i].bodies[j].fb2Body;
									b.SetAwake(true);
								}
							}
						}
						
						//get the distance between the pointer down and the Actor's first body center
						PE.selected.pAdjust.x = FLAG.Scene.actors[PE.selected.index].bodies[0].fb2Body.GetPosition().x - (FLAG.Pointer.mapLoc.x/FLAG.Box2D.scale);
						PE.selected.pAdjust.y = FLAG.Scene.actors[PE.selected.index].bodies[0].fb2Body.GetPosition().y - (FLAG.Pointer.mapLoc.y/FLAG.Box2D.scale);
					
					//is a a sprite selected
					}else if(FLAG.spritesClicked()[0] != undefined){
						PE.selected.type = "sprite";
						PE.selected.index = FLAG.spritesClicked()[0].sIndex;
						PE.selected.dragging = true;
						
						//get the distance between the pointer down and the Spite center
						PE.selected.pAdjust.x = FLAG.Scene.sprites[PE.selected.index].x - FLAG.Pointer.mapLoc.x;
						PE.selected.pAdjust.y = FLAG.Scene.sprites[PE.selected.index].y - FLAG.Pointer.mapLoc.y;
					
					}else{
						PE.selected.type = null;
						PE.selected.index = null;
						PE.selected.dragging = false;
						PE.selected.pAdjust = {x:0,y:0};
					}
				}
				
			
			}
			
			//using center mouse button?
			if(e.button == 1  || (e.touches != undefined && e.touches.length == 2)){
				FLAG.Scene.dragStart();
			}
				
			//using right mouse button?
			if(e.button == 2){
			
			}
		}
		
		//Actor Canvas 
		if(PE.mouse_on_actorPreview(e) == true){
			PE.assets_actors_preview_mouseDown(e);
		}
		
		//World Collider Canvas
		if(PE.mouse_on_worldColliderPreview(e) == true){
			PE.scene_box2d_worldColliders_preview_mouseDown(e);
		}
			
	}
	
	FLAG.Scene.mouseWheel = function(e){
		/*
		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
		if(PE.mouse_on_canvasORgui(e) == true){
			if(delta == 1){
				FLAG.zoomOut();
			}else if(delta == -1){
				FLAG.zoomIn();
			}
		}
		*/
	}
	
	FLAG.Scene.keyDown = function(e){
		if (e.shiftKey && e.ctrlKey && e.keyCode == 49){
			PE.menus_view('tools');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 50){
			PE.menus_view('menus');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 51){
			PE.menus_view('json');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 71){
			PE.menus_view('grid');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 87){
			PE.menus_view('walkables');
		}
		if (e.shiftKey && e.ctrlKey && e.keyCode == 66){
			PE.menus_view('debugDraw');
		}
		//Import
		if (e.shiftKey && e.ctrlKey && e.keyCode == 73){
			PE.menus_popUps('importPOLE');
		}
		//Export
		if (e.shiftKey && e.ctrlKey && e.keyCode == 69){
			PE.menus_popUps('exportJSON');
		}
		//Undo
		if (e.shiftKey && e.ctrlKey && e.keyCode == 90){
			PE.undo();
		}
	}
	//------------------------------------------------------------------------------------------
	//END FLAG SCENE METHODS
	
	PE.reloadTimeOut = 0;
}
//----------------------------------------------------------------------------------------------
//END SCENE LOADED



//SCENE RELOAD
//reload the current scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_reload = function(){
	if(this.reloadTimeOut == 0){
		this.reloadTimeOut = 1;
		
		//RESTORE CURRENT LOC and SCALE
		this.mapLoc = {x:FLAG.Scene.Map.x,y:FLAG.Scene.Map.y};
		this.scale = FLAG.Scene.scale;
		this.pole_update_display();
			
		FLAG.loadScene(PE.sceneSelected,PE.scene_loaded);
		
		//RESTORE LOC and ZOOM
		FLAG.Scene.Map.x = this.mapLoc.x;
		FLAG.Scene.Map.y = this.mapLoc.y;
		FLAG.Scene.scale = this.scale;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE RELOAD



//SCENE REMOVE
//Removes a scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_remove = function(){
	if(POLE.scenes.length > 1){
		this.undo_create();
		POLE.scenes.splice(this.sceneSelected,1);
		if(this.sceneSelected != 0){
			this.sceneSelected -= 1;
		}
		this.activeLayer = 0;
		this.scene_reload();
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE REMOVE



//SCENE SELECT
//Selects a scene to load and edit
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_select = function(){
	this.sceneSelected = document.getElementById("scenesList").selectedIndex;
	this.activeLayer = 0;
	document.getElementById("scenesList").blur();
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE SELECT



//SCENE SETUP BACKGROUND COLOR
//Changes the scene's background color
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_backgroundColor = function(){
	this.undo_create();
	POLE.scenes[this.sceneSelected].bgColor = document.getElementById("bgColor").value;
	FLAG.Scene.bgColor = POLE.scenes[this.sceneSelected].bgColor;
	document.getElementById("bgColor").style.backgroundColor = '#'+FLAG.Scene.bgColor;
	this.pole_update_display();
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP BACKGROUND COLOR



//SCENE SETUP BACKGROUND IMAGE
//Changes the scene's background image
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_backgroundImage = function(){
	this.undo_create();
	
	//change POLE
	if(document.getElementById("bgImageList").selectedIndex == 0){
		POLE.scenes[this.sceneSelected].bgImage  = null;
	}else{
		POLE.scenes[this.sceneSelected].bgImage = document.getElementById("bgImageList").selectedIndex - 1;
	}
	
	//change scene
	FLAG.Scene.bgImage = FLAG.Scene.images[POLE.scenes[this.sceneSelected].bgImage];
	
	//refresh the editor
	this.pole_update_display();
	this.scene_loaded();
	
	//clear pop ups
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP BACKGROUND IMAGE



//SCENE SETUP MAP DIMENSIONS
//Edit the size of the map in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_mapDimensions = function(){
	this.undo_create();
	//make the arrays the right size
	var numLayers = POLE.scenes[this.sceneSelected].layers.length;	
	for(var l=0;l<numLayers;l++){
		var temp_tileIDs = [];
		var temp_tileSheetIDs = [];
		var temp_tiledObjectIDs = [];
		if(l==0){var temp_walkableTiles = [];};
		for(var r=0;r<Number(document.getElementById("tilesHigh").value);r++){
			var row = [];
			for(var c=0;c<Number(document.getElementById("tilesWide").value);c++){
				row.push(0);
			}	
			temp_tileIDs.push(row);	
		}	
		for(var r=0;r<Number(document.getElementById("tilesHigh").value);r++){
			var row = [];
			for(var c=0;c<Number(document.getElementById("tilesWide").value);c++){
				row.push(0);
			}	
			temp_tileSheetIDs.push(row);	
		}
		for(var r=0;r<Number(document.getElementById("tilesHigh").value);r++){
			var row = [];
			for(var c=0;c<Number(document.getElementById("tilesWide").value);c++){
				row.push(0);
			}	
			temp_tiledObjectIDs.push(row);	
		}
		if(l==0){
			for(var r=0;r<Number(document.getElementById("tilesHigh").value);r++){
				var row = [];
				for(var c=0;c<Number(document.getElementById("tilesWide").value);c++){
					row.push(1);
				}	
				temp_walkableTiles.push(row);	
			}
		}
		
		if(POLE.scenes[this.sceneSelected].layers[l].tileIDs.length == 0){
			var old_Width = 0;
			var old_Height = 0;
		}else{
			var old_Width = POLE.scenes[this.sceneSelected].layers[l].tileIDs[0].length;
			var old_Height = POLE.scenes[this.sceneSelected].layers[l].tileIDs.length;
		}
		var new_Width = Number(document.getElementById("tilesWide").value);
		var new_Height = Number(document.getElementById("tilesHigh").value);
		var startRow = 0;
		var startCol = 0;
		var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
		switch(this.mapLock){
			case "upLeft":
				for(var r=0;r<new_Height;r++){
					for(var c=0;c<new_Width;c++){
						if(r < old_Height && c < old_Width){
							
							//if there is a tiledObject on this tile, make it empty and the tileID empty 
							//this will be added back at the end it the tiledObject still fits
							if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
							}else{
								temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
								temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
								temp_tiledObjectIDs[r][c] = 0;
							}
							
							if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
						}else{
							temp_tileIDs[r][c] = 0;
							temp_tileSheetIDs[r][c] = 0;
							temp_tiledObjectIDs[r][c] = 0;
							if(l==0){temp_walkableTiles[r][c] = 1;};
						}
					}	
				}	
				break;
			case "up":
				if(new_Width > old_Width){
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
							
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width < old_Width){
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width == old_Width){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
							
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}	
				}
				break;
			case "upRight":
				if(new_Width > old_Width){
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width < old_Width){
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width == old_Width){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}	
				}
				break;
			case "left":
				if(new_Height > old_Height){
					var startRow = Math.floor((new_Height - old_Height)/2);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height < old_Height){
					var startRow = Math.floor((old_Height - new_Height)/2);
					
					//move all tiledObject rows up
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
							
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
							
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}	
				}
				break;
			case "middle":
				if(new_Width > old_Width && new_Height > old_Height){
					var startRow = Math.floor((new_Height - old_Height)/2);
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject rows down and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r-startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width > old_Width && new_Height < old_Height){
					var startRow = Math.floor((old_Height - new_Height)/2);
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject rows up and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r+startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width > old_Width && new_Height == old_Height){
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height > old_Height){
					var startRow = Math.floor((new_Height - old_Height)/2);
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject rows down and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width < old_Width && new_Height < old_Height){
					var startRow = Math.floor((old_Height - new_Height)/2);
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject rows up and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height == old_Height){
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height > old_Height){
					var startRow = Math.floor((new_Height - old_Height)/2);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height < old_Height){
					var startRow = Math.floor((old_Height - new_Height)/2);
					
					//move all tiledObject rows up
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}
				break;
			case "right":
				if(new_Height > old_Height && new_Width > old_Width){
					var startRow = Math.floor((new_Height - old_Height)/2);
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject rows down and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r-startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height < old_Height && new_Width < old_Width){
					var startRow = Math.floor((old_Height - new_Height)/2);
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject rows up and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height > old_Height && new_Width == old_Width){
					var startRow = Math.floor((new_Height - old_Height)/2);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height < old_Height && new_Width == old_Width){
					var startRow = Math.floor((old_Height - new_Height)/2);
					
					//move all tiledObject rows up
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height == old_Height && new_Width > old_Width){
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height == old_Height && new_Width < old_Width){
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width == old_Width && new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}	
				}
				break;
			case "downLeft":
				if(new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					
					//move all tiledObject rows up
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}								
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}	
				}
				break;
			case "down":
				if(new_Width > old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject rows down and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r-startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width > old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject rows up and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r+startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width > old_Width && new_Height == old_Height){
					var startCol = Math.floor((new_Width - old_Width)/2);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject rows down and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width < old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject rows up and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height == old_Height){
					var startCol = Math.floor((old_Width - new_Width)/2);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}	
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}
				break;
			case "downRight":
				if(new_Width > old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject rows down and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r-startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}else if(new_Width > old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject rows up and columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r+startRow < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width > old_Width && new_Height == old_Height){
					var startCol = Math.floor(new_Width - old_Width);
					
					//move all tiledObject columns to the right
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col += startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=startCol;c<new_Width;c++){
							if(r < old_Height && c-startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c-startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c-startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c-startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c-startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject rows down and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}						
				}else if(new_Width < old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject rows up and columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width < old_Width && new_Height == old_Height){
					var startCol = Math.floor(old_Width - new_Width);
					
					//move all tiledObject columns to the left
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].col -= startCol;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c+startCol < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c+startCol] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c+startCol];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c+startCol];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c+startCol];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height > old_Height){
					var startRow = Math.floor(new_Height - old_Height);
					
					//move all tiledObject rows down
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row += startRow;
					}
					
					for(var r=startRow;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r-startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r-startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r-startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r-startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r-startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height < old_Height){
					var startRow = Math.floor(old_Height - new_Height);
					
					//move all tiledObject rows up
					for(var to=0;to<numTiledObjects;to++){
						POLE.scenes[this.sceneSelected].tiledObjects[to].row -= startRow;
					}
					
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r+startRow < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r+startRow][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r+startRow][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r+startRow][c];
									temp_tiledObjectIDs[r][c] = 0;
								}
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r+startRow][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}							
				}else if(new_Width == old_Width && new_Height == old_Height){
					for(var r=0;r<new_Height;r++){
						for(var c=0;c<new_Width;c++){
							if(r < old_Height && c < old_Width){
								
								//if there is a tiledObject on this tile, make it empty and the tileID empty 
								//this will be added back at the end it the tiledObject still fits
								if(POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs[r][c] != 0){
									temp_tileIDs[r][c] = 0;
									temp_tileSheetIDs[r][c] = 0;
									temp_tiledObjectIDs[r][c] = 0;
								}else{
									temp_tileIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileIDs[r][c];
									temp_tileSheetIDs[r][c] = POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs[r][c];
									temp_tiledObjectIDs[r][c] = 0;
								}	
								
								if(l==0){temp_walkableTiles[r][c] = POLE.scenes[this.sceneSelected].walkableTiles[r][c];};
							}else{
								temp_tileIDs[r][c] = 0;
								temp_tileSheetIDs[r][c] = 0;
								temp_tiledObjectIDs[r][c] = 0;
								if(l==0){temp_walkableTiles[r][c] = 1;};
							}
						}	
					}
				}
				break;
		}

		POLE.scenes[this.sceneSelected].layers[l].tileIDs = temp_tileIDs;
		POLE.scenes[this.sceneSelected].layers[l].tileSheetIDs = temp_tileSheetIDs;
		POLE.scenes[this.sceneSelected].layers[l].tiledObjectIDs = temp_tiledObjectIDs;
		if(l==0){POLE.scenes[this.sceneSelected].walkableTiles = temp_walkableTiles;};
	}
	POLE.scenes[this.sceneSelected].tilesWide = Number(document.getElementById("tilesWide").value);
	POLE.scenes[this.sceneSelected].tilesHigh = Number(document.getElementById("tilesHigh").value);
	document.getElementById("scene_tiles_Wide").innerHTML = POLE.scenes[this.sceneSelected].tilesWide;
	document.getElementById("scene_tiles_High").innerHTML = POLE.scenes[this.sceneSelected].tilesHigh;	
	
	//go through all the tiledObjects and keep them if they still fit
	var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
	var tiledObjectsToKeep = [];
	for(var to=0;to<numTiledObjects;to++){
		if(this.scene_setUp_mapDimensions_tiledObjectCheck(to,new_Height,new_Width)==true){
			tiledObjectsToKeep.push(POLE.scenes[this.sceneSelected].tiledObjects[to]);
		}
	}
	POLE.scenes[this.sceneSelected].tiledObjects = [];
	POLE.scenes[this.sceneSelected].tiledObjects = tiledObjectsToKeep;
	
	//add the tiled objects that were kept back to the arrays
	var numTiledObjects = POLE.scenes[this.sceneSelected].tiledObjects.length;
	
	for(var to=0;to<numTiledObjects;to++){
		
		var theTiledObject = POLE.scenes[this.sceneSelected].tiledObjects[to];
		
		switch(POLE.scenes[this.sceneSelected].type){
			case "orthogonal":
				var numRows = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.h;
				var numCols = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.w;
				var tileCount = 1;
				for(var r=0;r<numRows;r++){
					for(var c=0;c<numCols;c++){
						POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tileIDs[theTiledObject.row+r][theTiledObject.col+c] = tileCount;
						POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tiledObjectIDs[theTiledObject.row+r][theTiledObject.col+c] = to+1;
						tileCount += 1;
					}
				}
				break;
			case "isometric":
				var numRows = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.h;
				var numCols = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.w;
				var tileCount = 1;
				for(var r=0;r<numRows;r++){
					for(var c=0;c<numCols;c++){
						//skip all the back rows, except for the last column of those rows
						//because they will not be see by the draw, since the tiles extend upward
						if(r!=numRows-1){
							if(c!=numCols-1){
								POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tileIDs[theTiledObject.row+r][theTiledObject.col+c] = 0;
							}else{
								//include the last column of each row
								POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tileIDs[theTiledObject.row+r][theTiledObject.col+c] = tileCount;
								tileCount += 1;
							}
						}else{
							//include every column of the front row
							POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tileIDs[theTiledObject.row+r][theTiledObject.col+c] = tileCount;
							tileCount += 1;
						}
						POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tiledObjectIDs[theTiledObject.row+r][theTiledObject.col+c] = to+1;
					}
				}
				break;
			case "hexagonal":
				var numRows = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.h;
				var numCols = POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.w;
				var tileCount = 1;
				for(var r=0;r<numRows;r++){
					for(var c=0;c<numCols;c++){
						POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tileIDs[theTiledObject.row+r][theTiledObject.col+c] = tileCount;
						POLE.scenes[this.sceneSelected].layers[theTiledObject.layer].tiledObjectIDs[theTiledObject.row+r][theTiledObject.col+c] = to+1;
						tileCount += 1;
					}
				}
				break;
		}
	}
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP MAP DIMENSIONS



//SCENE SETUP MAP DIMENSIONS LOCK
//Locks a map in a direction while dimensions are changed
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_mapDimensions_lock = function(which){
	document.getElementById("upLeft").style.backgroundPosition = "-0px -0px";
	document.getElementById("up").style.backgroundPosition = "-23px -0px";
	document.getElementById("upRight").style.backgroundPosition = "-46px -0px";
	document.getElementById("left").style.backgroundPosition = "-0px -23px";
	document.getElementById("middle").style.backgroundPosition = "-23px -23px";
	document.getElementById("right").style.backgroundPosition = "-46px -23px";
	document.getElementById("downLeft").style.backgroundPosition = "-0px -47px";
	document.getElementById("down").style.backgroundPosition = "-23px -47px";
	document.getElementById("downRight").style.backgroundPosition = "-46px -47px";
	switch(which.id){
		case "upLeft":
			document.getElementById("upLeft").style.backgroundPosition = "-0px -70px";
			this.mapLock = "upLeft";
			break;
		case "up":
			document.getElementById("up").style.backgroundPosition = "-23px -70px";
			this.mapLock = "up";
			break;
		case "upRight":
			document.getElementById("upRight").style.backgroundPosition = "-46px -70px";
			this.mapLock = "upRight";
			break;
		case "left":
			document.getElementById("left").style.backgroundPosition = "-0px -93px";
			this.mapLock = "left";
			break;
		case "middle":
			document.getElementById("middle").style.backgroundPosition = "-23px -93px";
			this.mapLock = "middle";
			break;
		case "right":
			document.getElementById("right").style.backgroundPosition = "-46px -93px";
			this.mapLock = "right";
			break;
		case "downLeft":
			document.getElementById("downLeft").style.backgroundPosition = "-0px -117px";
			this.mapLock = "downLeft";
			break;
		case "down":
			document.getElementById("down").style.backgroundPosition = "-23px -117px";
			this.mapLock = "down";
			break;
		case "downRight":
			document.getElementById("downRight").style.backgroundPosition = "-46px -117px";
			this.mapLock = "downRight";
			break;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP MAP DIMENSIONS LOCK



//SCENE SETUP MAP DIMENSIONS TILED OBJECT CHECK
//Checks to make sure a tiled object still fits on the map after its dimensions have changed
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_mapDimensions_tiledObjectCheck = function(tiledObjectIndex,rows,cols){
	var stillFits = true;
	var theTiledObject = POLE.scenes[this.sceneSelected].tiledObjects[tiledObjectIndex];
	//is the tiled object on the Map
	if(theTiledObject.row >= 0 && theTiledObject.row < rows && theTiledObject.col >= 0 && theTiledObject.col < cols){
		for(var r=0;r<POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.h;r++){
			for(var c=0;c<POLE.tiledObjectSheets[theTiledObject.pIndex].numTiles.w;c++){
				if(theTiledObject.row+r < rows && theTiledObject.col+c < cols){
					//tiled object fits on map
				}else{
					//tiled object does not fit on Map
					stillFits = false;
				}
			}
		}
			
	//tiled object not on Map
	}else{
		stillFits = false;
	}
	
	return stillFits;
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP MAP DIMENSIONS TILED OBJECT CHECK



//SCENE SETUP MAP TYPE
//Change the map type of the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_mapType = function(but){
	this.undo_create();
	POLE.scenes[this.sceneSelected].type = but.value;
	switch(but.value){
		case "orthogonal":
			document.getElementById("scene_tile_Height").innerHTML = document.getElementById("scene_tile_Width").innerHTML;
			break;
		case "isometric":
			document.getElementById("scene_tile_Height").innerHTML = Number(document.getElementById("scene_tile_Width").innerHTML)/2;
			break;
		case "hexagonal":
			document.getElementById("scene_tile_Height").innerHTML = document.getElementById("scene_tile_Width").innerHTML;
			break;	
	}
	POLE.scenes[this.sceneSelected].tileHeight = Number(document.getElementById("scene_tile_Height").innerHTML);
	this.scene_reload();
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP MAP TYPE



//SCENE SETUP NAME
//Change the name of the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_name = function(){
	this.undo_create();
	POLE.scenes[this.sceneSelected].name = document.getElementById("sceneName").value;
	FLAG.Scene.name = POLE.scenes[this.sceneSelected].name;
	this.pole_update_display();
	this.scene_fillList();
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP NAME



//SCENE SETUP TILE DIMENSIONS
//Change the tile dimensions of the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_tileDimensions = function(){
	this.undo_create();
	if(document.getElementById("isometric").checked == true){
		document.getElementById("tileHeight").value = Number(document.getElementById("tileWidth").value)/2;		
	}else if(document.getElementById("hexagonal").checked == true){
		document.getElementById("tileHeight").value = document.getElementById("tileWidth").value;
	}
	POLE.scenes[this.sceneSelected].tileWidth = Number(document.getElementById("tileWidth").value);
	POLE.scenes[this.sceneSelected].tileHeight = Number(document.getElementById("tileHeight").value);
	document.getElementById("scene_tile_Width").innerHTML = POLE.scenes[this.sceneSelected].tileWidth;
	document.getElementById("scene_tile_Height").innerHTML = POLE.scenes[this.sceneSelected].tileHeight;
	
	this.scene_reload();
	document.getElementById("popUp").className = "";
	document.getElementById("popUp").innerHTML = "";
	document.getElementById("popUp").style.visibility = "hidden";
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP TILE DIMENSIONS



//SCENE SETUP TILE DIMENSIONS BLUR
//Edit one of the tile dimensions fields, adjusts the other number if need be
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.scene_setUp_tileDimensions_blur = function(){
	if(document.getElementById("isometric").checked == true){
		document.getElementById("tileHeight").value = Number(document.getElementById("tileWidth").value)/2;
	}else if(document.getElementById("hexagonal").checked == true){
		document.getElementById("tileHeight").value = document.getElementById("tileWidth").value;
	}
}
//----------------------------------------------------------------------------------------------
//END SCENE SETUP TILE DIMENSIONS BLUR

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END SCENE




//TOOLS 
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//TOOLS ACTOR ADD
//Adds an actor to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_actor_add = function(){
	if(this.actorSelected != -1){
		var numActors = POLE.scenes[this.sceneSelected].actors.length;
		
		//add to POLE
		POLE.scenes[this.sceneSelected].actors.push(
		{
				name:POLE.actors[this.actorSelected].name+"_"+numActors,
				pIndex:this.actorSelected,
				position:{x:Math.floor(FLAG.Pointer.mapLoc.x),y:Math.floor(FLAG.Pointer.mapLoc.y)},
				layer:this.activeLayer
		});
				
		//add actor to scene
		FLAG.addActor(POLE.actors[this.actorSelected].name,POLE.actors[this.actorSelected].name+"_"+numActors,{x:Math.floor(FLAG.Pointer.mapLoc.x),y:Math.floor(FLAG.Pointer.mapLoc.y),layer:this.activeLayer});

		//refresh the editor
		this.pole_update_display();
		this.scene_loaded();
		
		//clear pop ups
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//TOOLS ACTOR ADD



//TOOLS SELECT
//Control the display and the selection of the tool buttons
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_select = function(which){
	document.getElementById("tool_move").style.backgroundPosition = "-71px -0px";
	document.getElementById("tool_draw").style.backgroundPosition = "-71px -32px";
	document.getElementById("tool_erase").style.backgroundPosition = "-71px -64px";
	document.getElementById("tool_drawTileSprites").style.backgroundPosition = "-71px -96px";
	document.getElementById("tool_eraseTileSprites").style.backgroundPosition = "-71px -128px";
	document.getElementById("tool_drawTiledObjects").style.backgroundPosition = "-71px -160px";
	document.getElementById("tool_eraseTiledObjects").style.backgroundPosition = "-71px -192px";
	document.getElementById("tool_walkables").style.backgroundPosition = "-71px -288px";
	document.getElementById("tool_addActor").style.backgroundPosition = "-71px -256px";
	document.getElementById("tool_addSprite").style.backgroundPosition = "-71px -224px";
	document.getElementById("tool_zoomIn").style.backgroundPosition = "-71px -320px";
	document.getElementById("tool_zoomOut").style.backgroundPosition = "-71px -352px";
	document.getElementById("tool_zeroMap").style.backgroundPosition = "-71px -448px";
	document.getElementById("tool_selectArrow").style.backgroundPosition = "-71px -480px";
	switch(which.id){
		case "tool_selectArrow":
			this.toolSelected = "selectArrow";
			document.getElementById("tool_selectArrow").style.backgroundPosition = "-103px -480px";
			break;
		case "tool_move":
			this.toolSelected = "move";
			document.getElementById("tool_move").style.backgroundPosition = "-103px -0px";
			break;
		case "tool_draw":
			this.toolSelected = "draw";
			document.getElementById("tool_draw").style.backgroundPosition = "-103px -32px";
			break;
		case "tool_erase":
			this.toolSelected = "erase";
			document.getElementById("tool_erase").style.backgroundPosition = "-103px -64px";
			break;
		case "tool_drawTileSprites":
			this.toolSelected = "drawTileSprites";
			document.getElementById("tool_drawTileSprites").style.backgroundPosition = "-103px -96px";
			break;
		case "tool_eraseTileSprites":
			this.toolSelected = "eraseTileSprites";
			document.getElementById("tool_eraseTileSprites").style.backgroundPosition = "-103px -128px";
			break;
		case "tool_drawTiledObjects":
			this.toolSelected = "drawTiledObjects";
			document.getElementById("tool_drawTiledObjects").style.backgroundPosition = "-103px -160px";
			break;
		case "tool_eraseTiledObjects":
			this.toolSelected = "eraseTiledObjects";
			document.getElementById("tool_eraseTiledObjects").style.backgroundPosition = "-103px -192px";
			break;
		case "tool_walkables":
			this.toolSelected = "walkables";
			document.getElementById("tool_walkables").style.backgroundPosition = "-103px -288px";
			break;
		case "tool_addActor":
			this.toolSelected = "addActor";
			document.getElementById("tool_addActor").style.backgroundPosition = "-103px -256px";
			break;
		case "tool_addSprite":
			this.toolSelected = "addSprite";
			document.getElementById("tool_addSprite").style.backgroundPosition = "-103px -224px";
			break;
		case "tool_zoomIn":
			this.toolSelected = "zoomIn";
			document.getElementById("tool_zoomIn").style.backgroundPosition = "-103px -320px";
			break;
		case "tool_zoomOut":
			this.toolSelected = "zoomOut";
			document.getElementById("tool_zoomOut").style.backgroundPosition = "-103px -352px";
			break;
		case "tool_zeroMap":
			this.toolSelected = "zeroMap";
			document.getElementById("tool_zeroMap").style.backgroundPosition = "-103px -448px";
			break;
	}	
	
	//hide menu bar menus
	this.menus_dropDowns("none");	
}
//----------------------------------------------------------------------------------------------
//END TOOLS SELECT



//TOOLS SPRITE ADD
//Adds a sprite to the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_sprite_add = function(){
	if(document.getElementById("spriteSheetList").selectedIndex != -1){
	
		
		var selectedIndex = document.getElementById("spriteSheetList").selectedIndex;
		var numSprites = POLE.scenes[this.sceneSelected].sprites.length;
		
		//add to POLE
		POLE.scenes[this.sceneSelected].sprites.push({
			name:POLE.spriteSheets[selectedIndex].name+"_"+numSprites,
			pIndex:selectedIndex,
			position:{x:FLAG.Pointer.mapLoc.x,y:FLAG.Pointer.mapLoc.y},	
			animation:null,
			frame:0,
			layer:Number(this.activeLayer),
			play:true,
			alpha:1,
			gui:false
		});
				
		//add sprite to scene
		FLAG.addSprite(POLE.spriteSheets[selectedIndex].name,POLE.spriteSheets[selectedIndex].name+"_"+numSprites,{x:FLAG.Pointer.mapLoc.x,y:FLAG.Pointer.mapLoc.y,frame:0,layer:Number(this.activeLayer)});
		
		//refresh the editor
		this.pole_update_display();
		this.scene_loaded();
		
		//clear pop ups
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
		
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS SPRITE ADD



//TOOLS TILE SPRITE DRAW 
//Draws tile sprites on the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tileSprite_draw = function(){
	if(FLAG.Pointer.onMap == true && this.tileAnimationSelected != -1 && POLE.scenes[this.sceneSelected].layers[this.activeLayer].tiledObjectIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] == 0){
		if(this.tileAnimationSelected != -1){
			var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
			var tileSpriteExists = false;
			var isItTheSame = true;
			var whichTileSprite = -1;
			//check for existing tile sprite on tile and layer
			for(var ts=0;ts<numTileSprites;ts++){
				if(POLE.scenes[this.sceneSelected].tileSprites[ts].row == FLAG.Pointer.tileOn.row &&
					POLE.scenes[this.sceneSelected].tileSprites[ts].col == FLAG.Pointer.tileOn.col &&
					POLE.scenes[this.sceneSelected].tileSprites[ts].layer == this.activeLayer){
					tileSpriteExists = true;
					if(POLE.scenes[this.sceneSelected].tileSprites[ts].pIndex == this.tileSelected.sheetNum &&
						POLE.scenes[this.sceneSelected].tileSprites[ts].animation == this.tileAnimationSelected){
						//the tile sprite is the same as the one trying to be drawn
						}else{
							isItTheSame = false;
						}					
					whichTileSprite = ts;
				}
			}
			
			if(tileSpriteExists == true && isItTheSame == true){
				//do nothing
			}else if(tileSpriteExists == true && isItTheSame == false){
				//clear the tileID and tileSheetIDs
				POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
				POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
			
				//change existing tile sprite
				POLE.scenes[this.sceneSelected].tileSprites[whichTileSprite].name = POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].name + "_" + numTileSprites;
				POLE.scenes[this.sceneSelected].tileSprites[whichTileSprite].pIndex = Number(this.tileSelected.sheetNum);
				POLE.scenes[this.sceneSelected].tileSprites[whichTileSprite].animation = Number(this.tileAnimationSelected);
				POLE.scenes[this.sceneSelected].tileSprites[whichTileSprite].frame = Number(POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].startFrame);
				
				if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
					this.pole_update_display();
				}
				
				this.scene_assets_tileSprites_fillList();
			}else{
				//clear the tileID and tileSheetIDs
				POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
				POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
				
				//create a new tile sprite
				var newTileSprite = {
					name:POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].name + "_" + numTileSprites,
					row:Number(FLAG.Pointer.tileOn.row),
					col:Number(FLAG.Pointer.tileOn.col),
					pIndex:Number(this.tileSelected.sheetNum),
					animation:Number(this.tileAnimationSelected),
					frame:Number(POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].startFrame),
					layer:Number(this.activeLayer),
					playing:true
				};
				
				//add new tile sprite to pole
				POLE.scenes[this.sceneSelected].tileSprites.push(newTileSprite);
				
				//create the tile sprite in the scene
				FLAG.addTileSprite(POLE.tileSheets[this.tileSelected.sheetNum].animations[this.tileAnimationSelected].name,newTileSprite.name,newTileSprite);
				
				this.scene_assets_tileSprites_fillList();
			
			
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS TILE SPRITE DRAW



//TOOLS TILE SPRITE ERASE 
//Removes tile sprites from the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tileSprite_erase = function(){
	var numTileSprites = POLE.scenes[this.sceneSelected].tileSprites.length;
	var tileSpritesToKeep = [];
	var tileSpritesToRemove = [];
	//check for existing tile sprite on tile and layer
	for(var ts=0;ts<numTileSprites;ts++){
		if(POLE.scenes[this.sceneSelected].tileSprites[ts].row == FLAG.Pointer.tileOn.row &&
			POLE.scenes[this.sceneSelected].tileSprites[ts].col == FLAG.Pointer.tileOn.col &&
			POLE.scenes[this.sceneSelected].tileSprites[ts].layer == this.activeLayer){
			
			tileSpritesToRemove.push(POLE.scenes[this.sceneSelected].tileSprites[ts]);			
		}else{
			tileSpritesToKeep.push(POLE.scenes[this.sceneSelected].tileSprites[ts]);
		}
	}
	
	if(POLE.scenes[this.sceneSelected].tileSprites.length != tileSpritesToKeep.length){
		//set the list of pole to the keepers
		POLE.scenes[this.sceneSelected].tileSprites = tileSpritesToKeep;
		//remove the tile sprites from the displayed scene
		var numToRemove = tileSpritesToRemove.length;
		for(var r=0;r<numToRemove;r++){
			FLAG.removeTileSprite(tileSpritesToRemove[r].name);
		}
		
		//empty arrays
		tileSpritesToKeep = [];
		tileSpritesToRemove = []
		
		//clear the tileID and tileSheetIDs
		POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
		POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
	
		if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
			this.pole_update_display();
		}
				
		this.scene_assets_tileSprites_fillList();	
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS ERASE TILE SPRITE



//TOOLS TILE DRAW
//Draws tiles on the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tile_draw = function(){
	if(FLAG.Pointer.onMap == true && this.tileSelected.tileNum != -1 && POLE.scenes[this.sceneSelected].layers[this.activeLayer].tiledObjectIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] == 0){
		if(POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] != this.tileSelected.sheetNum ||
		POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] != this.tileSelected.tileNum){
			POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = this.tileSelected.sheetNum;
			POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = this.tileSelected.tileNum;
			if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
				this.pole_update_display();
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS TILE DRAW



//TOOLS TILE ERASE
//Removes tiles from the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tile_erase = function(){
	if(FLAG.Pointer.onMap == true && POLE.scenes[this.sceneSelected].layers[this.activeLayer].tiledObjectIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] == 0){
		if(POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] != 0 ||
		POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] != 0){
			POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileSheetIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
			POLE.scenes[this.sceneSelected].layers[this.activeLayer].tileIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
			if(window.getComputedStyle(document.getElementById('code_container')).getPropertyValue('visibility') == "visible"){
				this.pole_update_display();
			}
		}
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS ERASE TILE



//TOOLS TILED OBJECTS DRAW 
//Draws tiled objects on the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tiledObjects_draw = function(){
	if(this.okToDrawTiledObject == true){
		var numTiledObjects = FLAG.Scene.tiledObjects.length;
		
		//add to POLE
		POLE.scenes[this.sceneSelected].tiledObjects.push({
			name:POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].name + "_" + numTiledObjects,
			row:Number(FLAG.Pointer.tileOn.row),
			col:Number(FLAG.Pointer.tileOn.col),
			pIndex:Number(document.getElementById("tiledObjectSheetList").selectedIndex),
			animation:null,
			frame:0,
			layer:Number(this.activeLayer)
		});
		
		//add tiled object to scene
		FLAG.addTiledObject(POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].name,POLE.tiledObjectSheets[document.getElementById("tiledObjectSheetList").selectedIndex].name + "_" + numTiledObjects,{row:Number(FLAG.Pointer.tileOn.row),col:Number(FLAG.Pointer.tileOn.col),frame:0,layer:Number(this.activeLayer)});
				
		//refresh the editor
		this.pole_update_display();
		this.scene_loaded();
		
		//clear pop ups
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS TILED OBJECTS DRAW 



//TOOLS TILED OBJECTS ERASE 
//Removes tiled objects from the map
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_tiledObjects_erase = function(){
	if(this.okToEraseTiledObject == true){
		var tiledObjectIndex = FLAG.Scene.layers[this.activeLayer].tiledObjectIDs[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col]-1;
		
		//remove from POLE
		var tiledObjectsToKeep = [];
		var numTiledObjects = FLAG.Scene.tiledObjects.length;
		var instanceName = "";
		for(var i=0;i<numTiledObjects;i++){
			if(i != tiledObjectIndex){
				tiledObjectsToKeep.push(POLE.scenes[this.sceneSelected].tiledObjects[i]);
			}else{
				instanceName = POLE.scenes[this.sceneSelected].tiledObjects[i].name;
			}
		}	
		POLE.scenes[this.sceneSelected].tiledObjects = tiledObjectsToKeep;
		tiledObjectsToKeep = [];
		
		//remove tiled object from scene
		FLAG.removeTiledObject(tiledObjectIndex);
		
		//refresh the editor
		this.pole_update_display();
		this.scene_loaded();
		
		//clear pop ups
		document.getElementById("popUp").className = "";
		document.getElementById("popUp").innerHTML = "";
		document.getElementById("popUp").style.visibility = "hidden";
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS TILED OBJECTS ERASE 



//TOOLS WALKABLE TILES EDIT
//Alters the walkable tile in the scene
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.tools_walkableTiles_edit = function(){
	if(FLAG.Pointer.onMap == true){
		if(POLE.scenes[this.sceneSelected].walkableTiles[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] == 0){
			POLE.scenes[this.sceneSelected].walkableTiles[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 1;
			FLAG.Scene.walkableTiles[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 1;
		}else{
			POLE.scenes[this.sceneSelected].walkableTiles[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
			FLAG.Scene.walkableTiles[FLAG.Pointer.tileOn.row][FLAG.Pointer.tileOn.col] = 0;
		}

		this.scene_reload();
	}
}
//----------------------------------------------------------------------------------------------
//END TOOLS WALKABLE TILES EDIT

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END TOOLS




//UNDO
//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------

//UNDO
//Set POLE back to the previous undo level
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.undo = function(){
	var numUndos = this.undos.length;
	if(numUndos > 0){
		POLE = this.undo_create_clone(this.undos[numUndos-1]);
		this.undos.splice(numUndos-1,1);
		this.scene_reload();
	}
}
//----------------------------------------------------------------------------------------------
//END UNDO



//UNDO CREATE
//Create a new undo level
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.undo_create = function(){
	var numUndos = this.undos.length;
	if(numUndos < 10){
		this.undos.push(this.undo_create_clone(POLE));
	}else{
		this.undos.splice(0,1);
		this.undos.push(this.undo_create_clone(POLE));
	}
}
//----------------------------------------------------------------------------------------------
//END POLE LOAD



//UNDO CREATE CLONE
//Clone the POLE object
//----------------------------------------------------------------------------------------------
POLEEDITOR.prototype.undo_create_clone = function(obj){
    return JSON.parse(JSON.stringify(obj));
};
//----------------------------------------------------------------------------------------------
//END UNDO CREATE CLONE

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END UNDO

//----------------------------------------------------------------------------------------------
//----------------------------------------------------------------------------------------------
//END POLE EDITOR CONSTRUCTOR