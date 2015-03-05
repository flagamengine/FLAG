/*
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
FLAG Game Engine - FLAG.js
Author: Zac Zidik
URL: www.flagamengine.com
version 3.0.20
updated 3/5/2015

This is the engine code for the FLAG Game Engine. You can use this file locally,
on your server, or the most up to date version at www.flagamengine.com/FLAG/FLAG.js

Thanks for trying out the FLAG Game Engine and good luck!
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
*/



//FLAGENGINE 
//Constructor for the FLAG Game Engine. When the DOM window is ready, an instance of this class is loaded into the FLAG object. 
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGENGINE(game,canvas,gui,glass){

	//PROPERTIES
	this.arrowUp = false;
	this.arrowDown= false;
	this.arrowLeft = false;
	this.arrowRight = false;
	this.Box2D = {world:{},scale:32,ready:false,debug:false,velIt:8,posIt:3,timeStep:1/60};
	this.Canvas = canvas;
	this.center = {x:canvas.width/2,y:canvas.height/2};
	this.Context = this.setContext('2d');
	this.Cursor = {on:false,tiles:null,tileAlpha:1,rect:null,point:null,image:null,images:null,imageAlpha:1};
	this.FPS = {now:60,prev:0,set:30,avg:60,avgA:[],sprites:15,useRAF:true,RAF:null};
	this.Game = game;
	this.Glass = glass;
	this.Grid = {on:false,color:"#505050",width:1,alpha:1};
	this.GUI = gui;
	this.lastW = canvas.width;
	this.lastH = canvas.height;
	this.Pointer = {screenLoc:{x:0,y:0},mapLoc:{x:0,y:0},downLoc:{x:0,y:0},tileOn:{row:0,col:0},onMap:false};
	this.running = false;
	this.scale = 1;
	this.Scene = null;
	this.sceneLoadProgress = 0;
	this.Sounds = [];
	this.spriteFrames_Interval = null;
	this.tilesToDraw = {row:{first:0,last:0},col:{first:0,last:0}};
	this.tilesToDrawIso = [];
	this.tGutter = {w:1,h:1};
	this.update_Interval = null;
	this.Walkables = {on:false,color_0:"#FF0000",color_1:"#00FF00",alpha:.25};
	this.WebGL = null;
	this.zoom = {in:2,out:.5};	
	
	//WebGL
	if(this.contextType == 'webgl'){
		this.WebGL = new FLAGWEBGL(this.Canvas, this.Context);
	}
};


//ACTOR
//Returns an actor in the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.Actor = function(actorName){
	var numActors = this.Scene.actors.length;
	for(var a=0;a<numActors;a++){
		if(this.Scene.actors[a].name == actorName){
			return this.Scene.actors[a];
		}
	}
}
//------------------------------------------------------------------
//END ACTOR


//ACTORS CLICK
//returns a list of names of actors under a pointer click
//------------------------------------------------------------------
FLAGENGINE.prototype.actorsClicked = function(){
	//an array to hold the names of the actors and their bodies clicked
	var actorsClicked = [];
	//get the mouse position
	var clickPoint = {x:this.Pointer.mapLoc.x, y:this.Pointer.mapLoc.y};
	//check all the actors
	var numActors = this.Scene.actors.length;
	for(var i=0;i<numActors;i++){
		var numBodies = this.Scene.actors[i].bodies.length;
		var clickedObject = {name:this.Scene.actors[i].name,bodies:[],sIndex:i};
		for(var j=0;j<numBodies;j++){
			var b = this.Scene.actors[i].bodies[j].fb2Body;
			var shape = this.Scene.actors[i].bodies[j].shape;
			var shapeDefinition = this.Scene.actors[i].bodies[j].shapeDefinition;
			//get the position of the body
			var x = ((b.GetPosition().x*this.Box2D.scale));
			var y = ((b.GetPosition().y*this.Box2D.scale));
			var bodyPoint = {x:x,y:y};
			switch(shape){
				case "circle":
					if(this.pointInCircle(clickPoint,bodyPoint,shapeDefinition.radius) == true){
						clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
					}
					break;
				case "box":
					//get angle of body in radians
					var angle = b.GetAngle();
					var rectPoints = []
					rectPoints.push({x:-(shapeDefinition.w/2),y:-(shapeDefinition.h/2)});
					rectPoints.push({x:(shapeDefinition.w/2),y:-(shapeDefinition.h/2)});
					rectPoints.push({x:(shapeDefinition.w/2),y:(shapeDefinition.h/2)});
					rectPoints.push({x:-(shapeDefinition.w/2),y:(shapeDefinition.h/2)});
					var points = [];
					for(var p=0;p<4;p++){
						var x = rectPoints[p].x;
						var y = rectPoints[p].y;
						
						//apply rotation to the points
						var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
						var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
						
						//add the body position to the points
						points.push({x:rot_x + bodyPoint.x,y:rot_y + bodyPoint.y});
					}
					
					//check if the click point is in side the shape
					if(this.pointInPoly(clickPoint,points) == true){
						clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
					}
					break;
				case "poly":
					//get angle of body in radians
					var angle = b.GetAngle();
					var points = [];
					var numPoints = shapeDefinition.length;
					for(var p=0;p<numPoints;p++){
						var x = shapeDefinition[p].x;
						var y = shapeDefinition[p].y;
						
						//apply rotation to the points
						var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
						var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
						
						//add the body position to the points
						points.push({x:rot_x + bodyPoint.x,y:rot_y + bodyPoint.y});
					}
					
					//check if the click point is in side the shape
					if(this.pointInPoly(clickPoint,points) == true){
						clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
					}
					break;
				case "tile":
					switch(this.Scene.Map.type){
						case "orthogonal":		
							//get angle of body in radians
							var angle = b.GetAngle();
							var rectPoints = []
							rectPoints.push({x:-(shapeDefinition.w/2),y:-(shapeDefinition.h/2)});
							rectPoints.push({x:(shapeDefinition.w/2),y:-(shapeDefinition.h/2)});
							rectPoints.push({x:(shapeDefinition.w/2),y:(shapeDefinition.h/2)});
							rectPoints.push({x:-(shapeDefinition.w/2),y:(shapeDefinition.h/2)});
							var points = [];
							for(var p=0;p<4;p++){
								var x = rectPoints[p].x;
								var y = rectPoints[p].y;
						
								//apply rotation to the points
								var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
								var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
						
								//add the body position to the points
								points.push({x:rot_x + bodyPoint.x,y:rot_y + bodyPoint.y});
							}
					
							//check if the click point is in side the shape
							if(this.pointInPoly(clickPoint,points) == true){
								clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
							}
							break;
						case "isometric":
							var isoShape = [];
							isoShape.push({x:-(shapeDefinition.w/2),y:0});
							isoShape.push({x:0,y:-(shapeDefinition.h/2)});
							isoShape.push({x:(shapeDefinition.w/2),y:0});
							isoShape.push({x:0,y:(shapeDefinition.h/2)});
							
							//get angle of body in radians
							var angle = b.GetAngle();
							var points = [];
							var numPoints = isoShape.length;
							for(var p=0;p<numPoints;p++){
								var x = isoShape[p].x;
								var y = isoShape[p].y;
						
								//apply rotation to the points
								var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
								var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
						
								//add the body position to the points
								points.push({x:rot_x + bodyPoint.x,y:rot_y + bodyPoint.y});
							}
					
							//check if the click point is in side the shape
							if(this.pointInPoly(clickPoint,points) == true){
								clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
							}
							break;
						case "hexagonal":
							var hexShape = [];
							hexShape.push({x:-(shapeDefinition.w/2),y:0});
							hexShape.push({x:-(shapeDefinition.w/4),y:-(shapeDefinition.h/2)});
							hexShape.push({x:(shapeDefinition.w/4),y:-(shapeDefinition.h/2)});
							hexShape.push({x:(shapeDefinition.w/2),y:0});
							hexShape.push({x:(shapeDefinition.w/4),y:(shapeDefinition.h/2)});
							hexShape.push({x:-(shapeDefinition.w/4),y:(shapeDefinition.h/2)});
							
							//get angle of body in radians
							var angle = b.GetAngle();
							var points = [];
							var numPoints = hexShape.length;
							for(var p=0;p<numPoints;p++){
								var x = hexShape[p].x;
								var y = hexShape[p].y;
						
								//apply rotation to the points
								var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
								var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
						
								//add the body position to the points
								points.push({x:rot_x + bodyPoint.x,y:rot_y + bodyPoint.y});
							}
					
							//check if the click point is in side the shape
							if(this.pointInPoly(clickPoint,points) == true){
								clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
							}
							break;
					}
					break;
			}
		}
		if(clickedObject.bodies.length > 0){
			actorsClicked.push(clickedObject);
		}
	}
	return actorsClicked;
}
//------------------------------------------------------------------
//END ACTOR CLICK


//ACTOR DECALS CLICK
//Returns a list of actor sprites under pointer
//------------------------------------------------------------------
FLAGENGINE.prototype.actorDecalsClicked = function(){
	//an array to hold the names of the sprites clicked
	var decalsClicked = [];
	//get the mouse position
	var clickPoint = {x:this.Pointer.mapLoc.x, y:this.Pointer.mapLoc.y};
	//check all the actors
	var numActors = this.Scene.actors.length;
	for(var i=0;i<numActors;i++){
		var numBodies = this.Scene.actors[i].bodies.length;
		for(var j=0;j<numBodies;j++){
			var b = this.Scene.actors[i].bodies[j].fb2Body;
			var as = this.Scene.spriteSheets[this.Scene.actors[i].bodies[j].Sprite.pIndex];
			//get the position of the body
			var x = ((b.GetPosition().x*this.Box2D.scale));
			var y = ((b.GetPosition().y*this.Box2D.scale));
			//check the body for sprites
			var numDecals = this.Scene.actors[i].bodies[j].Sprite.decals.length;
			for(var d=0;d<numDecals;d++){
				//get the position of the decal
				var decalRect = this.Scene.spriteSheets[this.Scene.actors[i].bodies[j].Sprite.decals[d].pIndex].tileRects[this.Scene.actors[i].bodies[j].Sprite.decals[d].frame];	
				var decalPoint = {x:x+(this.Scene.actors[i].bodies[j].Sprite.decals[d].x), y:y+(this.Scene.actors[i].bodies[j].Sprite.decals[d].y)};
				//set up the rect to check
				var checkRect = {x:0,y:0,w:0,h:0};
				checkRect.x = decalPoint.x - ((decalRect.w/2)*this.scale);
				checkRect.y = decalPoint.y - ((decalRect.h/2)*this.scale);
				checkRect.w = decalRect.w*this.scale;
				checkRect.h = decalRect.h*this.scale;
			
				if(this.pointInRect(clickPoint,checkRect) == true){
					decalsClicked.push(this.Scene.actors[i].bodies[j].Sprite.decals[d].name);
				}	
			}
		}
	}
	return decalsClicked;
}
//------------------------------------------------------------------
//END ACTOR DECAL CLICK


//ADD ACTOR
//Add an actor to the scene at runtime
//------------------------------------------------------------------
FLAGENGINE.prototype.addActor = function(actorName,instanceName,p){
	if(typeof p != "object"){var p={x:0,y:0,layer:0};};
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('layer')){p.layer = 0;};

	//find the number that matches the name of the actor
	var numActors = POLE.actors.length;
	var pIndex = -1;
	for(var a=0;a<numActors;a++){
		if(actorName == POLE.actors[a].name){
			pIndex = a;
			break;
		}
	}
	if(pIndex != -1){
		var numActors = this.Scene.actors.length;
		var newName = instanceName;
		var newPosition = {x:p.x,y:p.y};
		var actorIndex = numActors;
		var newActor = new FLAGACTOR(pIndex,newName,newPosition,p.layer);
		this.Scene.actors.push(newActor);
		var numBodies = POLE.actors[pIndex].bodies.length;
		var bodies = [];
		for(var b=0;b<numBodies;b++){
			var newActor_Body = new FLAGBODY(POLE.actors[pIndex].bodies[b].name);
			newActor.bodies.push(newActor_Body);
		}
		var numJoints = POLE.actors[pIndex].joints.length;
		var joints = [];
		for(var j=0;j<numJoints;j++){
			var newActor_Joint = new FLAGJOINT(POLE.actors[pIndex].joints[j].name);
			newActor.joints.push(newActor_Joint);
		}
		
		this.addActorToWorld(actorIndex);
	}
}
//------------------------------------------------------------------
//END ADD ACTOR


//ADD ACTOR TO WORLD
//Adds an actor to the box 2d physics world
//------------------------------------------------------------------
FLAGENGINE.prototype.addActorToWorld = function(i){
	var theActor = this.Scene.actors[i];
	var numBodies = theActor.bodies.length;
	for(var j=0;j<numBodies;j++){
		var bodyDef = new b2BodyDef;
		var fixDef = new b2FixtureDef;
		switch(POLE.actors[theActor.pIndex].bodies[j].shape){
			case "box":		
				fixDef.shape = new b2PolygonShape;
				fixDef.shape.SetAsBox((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale);
				break;
			case "circle":
				var radius = POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.radius/this.Box2D.scale;
				fixDef.shape = new b2CircleShape(radius);
				break;
			case "poly":
				fixDef.shape = new b2PolygonShape;
				var numPoints = POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.length;
				var newArray = [];
				for(var p=0;p<numPoints;p++){
					newArray.push({x:POLE.actors[theActor.pIndex].bodies[j].shapeDefinition[p].x/this.Box2D.scale,y:POLE.actors[theActor.pIndex].bodies[j].shapeDefinition[p].y/this.Box2D.scale});
				}
				fixDef.shape.SetAsArray(newArray);
				break;
			case "tile":		
				switch(this.Scene.Map.type){
					case "orthogonal":		
						fixDef.shape = new b2PolygonShape;
						fixDef.shape.SetAsBox((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale);
						break;
					case "isometric":
						fixDef.shape = new b2PolygonShape;
						fixDef.shape.SetAsArray([
							new b2Vec2(0,-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,0),
							new b2Vec2(0,(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2(-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,0)
						]);
						break;
					case "hexagonal":		
						fixDef.shape = new b2PolygonShape;
						fixDef.shape.SetAsArray([
							new b2Vec2(-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/4)/this.Box2D.scale,-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/4)/this.Box2D.scale,-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,0),
							new b2Vec2((POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/4)/this.Box2D.scale,(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2(-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/4)/this.Box2D.scale,(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.h/2)/this.Box2D.scale),
							new b2Vec2(-(POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.w/2)/this.Box2D.scale,0)
						]);
						break;
				}
				break;
			default:
				break;
		}
		
		
		fixDef.density = POLE.actors[theActor.pIndex].bodies[j].fixDef.density;
		fixDef.friction = POLE.actors[theActor.pIndex].bodies[j].fixDef.friction;
		fixDef.restitution = POLE.actors[theActor.pIndex].bodies[j].fixDef.restitution;
		fixDef.filter.groupIndex = POLE.actors[theActor.pIndex].bodies[j].fixDef.filter.groupIndex;
		
		
		switch(POLE.actors[theActor.pIndex].bodies[j].type){
			case "static":
				bodyDef.type = b2Body.b2_staticBody;
				break;
			case "dynamic":
				bodyDef.type = b2Body.b2_dynamicBody;
				break;
			case "kinematic":
				bodyDef.type = b2Body.b2_kinematicBody;
				break;
		}
		
		if(j==0){
			bodyDef.position.x = theActor.position.x;
			bodyDef.position.y = theActor.position.y;
		}else{
			bodyDef.position.x = theActor.position.x + POLE.actors[theActor.pIndex].bodies[j].position.x;
			bodyDef.position.y = theActor.position.y + POLE.actors[theActor.pIndex].bodies[j].position.y;
		}
		
		//adjust position from pixels to Box2D
		bodyDef.position.Set(bodyDef.position.x/this.Box2D.scale,bodyDef.position.y/this.Box2D.scale);
		
		bodyDef.userData = {
			name				:	POLE.actors[theActor.pIndex].bodies[j].name,
			parentActorName		:	""
		};
		bodyDef.userData.parentActorName = theActor.name;
		
		//adds the body to the world
		theActor.bodies[j].fb2Body = this.Box2D.world.CreateBody(bodyDef);
		
		//if shape of body is defined as a polygon
		if(POLE.actors[theActor.pIndex].bodies[j].shape == "poly"){
			
			var numPoints = POLE.actors[theActor.pIndex].bodies[j].shapeDefinition.length;
			var newArray = [];
			for(var p=0;p<numPoints;p++){
				newArray.push({x:POLE.actors[theActor.pIndex].bodies[j].shapeDefinition[p].x/this.Box2D.scale,y:POLE.actors[theActor.pIndex].bodies[j].shapeDefinition[p].y/this.Box2D.scale});
			}
			
			//Separator Validator
			//checks if points are arrange in a clockwise order
			//if(Box2DSeparator.validate(newArray)==0){console.log("Good");}else{console.log("No Good");}
		
			//separates the body into convex shapes
			Box2DSeparator.separate(theActor.bodies[j].fb2Body, fixDef, newArray, this.Box2D.scale);
		
		//if shape of body is not defined as a polygon
		}else{
			
			theActor.bodies[j].fb2Body.CreateFixture(fixDef);
		
		}
					
		if(POLE.actors[theActor.pIndex].bodies[j].fixedRotation == true){
			theActor.bodies[j].fb2Body.SetFixedRotation(true);
		}
		
		//give the body it's sprite
		if(POLE.actors[theActor.pIndex].bodies[j].spriteSheet != null){
			theActor.bodies[j].Sprite = new FLAGSPRITE(POLE.actors[theActor.pIndex].bodies[j].name,POLE.actors[theActor.pIndex].bodies[j].spriteSheet,0,0,POLE.actors[theActor.pIndex].bodies[j].frame,POLE.actors[theActor.pIndex].bodies[j].animation,POLE.actors[theActor.pIndex].layer);
		}else{
			theActor.bodies[j].Sprite = null;
		}
		
		//give the body shape and shapeDefinition properties
		theActor.bodies[j].shape = POLE.actors[theActor.pIndex].bodies[j].shape;
		theActor.bodies[j].shapeDefinition = POLE.actors[theActor.pIndex].bodies[j].shapeDefinition;
	}
	
	
	var numJoints = theActor.joints.length;
	for(var j=0;j<numJoints;j++){
		var jointDef = new b2JointDef;
		switch(POLE.actors[theActor.pIndex].joints[j].type){
			case "distance":
				theActor.joints[j].fb2Joint = new b2DistanceJointDef();
				jointDef = new b2DistanceJointDef();
				jointDef.frequencyHz = POLE.actors[theActor.pIndex].joints[j].frequencyHz;
				jointDef.dampingRatio = POLE.actors[theActor.pIndex].joints[j].dampingRatio;
				jointDef.collideConnected = POLE.actors[theActor.pIndex].joints[j].collideConnected;
				jointDef.Initialize(theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body1].fb2Body,theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body2].fb2Body,theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body1].fb2Body.GetWorldCenter(),theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body2].fb2Body.GetWorldCenter());
				theActor.joints[j].fb2Joint = this.Box2D.world.CreateJoint(jointDef);
				break;
			case "revolve":
				theActor.joints[j].fb2Joint = new b2RevoluteJointDef();
				jointDef = new b2RevoluteJointDef();
				jointDef.motorSpeed = POLE.actors[theActor.pIndex].joints[j].motorSpeed;
				jointDef.maxMotorTorque = POLE.actors[theActor.pIndex].joints[j].maxMotorTorque;
				jointDef.enableMotor = POLE.actors[theActor.pIndex].joints[j].enableMotor;
				jointDef.lowerAngle = POLE.actors[theActor.pIndex].joints[j].lowerAngle*(Math.PI/180);
				jointDef.upperAngle = POLE.actors[theActor.pIndex].joints[j].upperAngle*(Math.PI/180);
				jointDef.enableLimit = POLE.actors[theActor.pIndex].joints[j].enableLimit;
				jointDef.collideConnected = POLE.actors[theActor.pIndex].joints[j].collideConnected;
				jointDef.userData = {anchor:POLE.actors[theActor.pIndex].joints[j].anchor};
				//is the anchor at the center of body 1 (lever) or body 2 (wheel)
				if(jointDef.userData.anchor == 1){
					var anchor = theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body1].fb2Body.GetWorldCenter();
				}else if(jointDef.userData.anchor == 2){
					var anchor = theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body2].fb2Body.GetWorldCenter();
				}
				jointDef.Initialize(theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body1].fb2Body, theActor.bodies[POLE.actors[theActor.pIndex].joints[j].body2].fb2Body, anchor);
				theActor.joints[j].fb2Joint = this.Box2D.world.CreateJoint(jointDef);
				break;
			default:
				break;
		}
	}
}
//------------------------------------------------------------------
//END ADD ACTOR TO WORLD


//ADD JOINT
//------------------------------------------------------------------
FLAGENGINE.prototype.addJoint = function(p){
	if(!p.hasOwnProperty('actorA')){p.actorA = null;};
	if(!p.hasOwnProperty('actorB')){p.actorB = null;};
	
	if(p.actorA != null && p.actorB != null){
		
		//BODY A
		//no bodyA is given
		if(!p.hasOwnProperty('bodyA')){
			//use body 0 of actor
			var numActors = this.Scene.actors.length;;
			for(var a=0;a<numActors;a++){
				if(this.Scene.actors[a].name == p.actorA){
					p.actorA = a;
					p.bodyA = 0;
				}
			}
		//bodyA name is given
		}else{
			var numActors = this.Scene.actors.length;;
			for(var a=0;a<numActors;a++){
				if(this.Scene.actors[a].name == p.actorA){
					p.actorA = a;
					var numBodies = this.Scene.actors[a].bodies.length;
					for(var b=0;b<numBodies;b++){
						if(this.Scene.actors[a].bodies[b].name == p.bodyA){
							p.bodyA = b;
						}
					}
				}
			}		
		}
		
		//BODY B
		//no bodyB is given
		if(!p.hasOwnProperty('bodyB')){
			//use body 0 of actor
			var numActors = this.Scene.actors.length;;
			for(var a=0;a<numActors;a++){
				if(this.Scene.actors[a].name == p.actorB){
					p.actorB = a;
					p.bodyB = 0;
				}
			}
		//bodyB name is given
		}else{
			var numActors = this.Scene.actors.length;;
			for(var a=0;a<numActors;a++){
				if(this.Scene.actors[a].name == p.actorB){
					p.actorB = a;
					var numBodies = this.Scene.actors[a].bodies.length;
					for(var b=0;b<numBodies;b++){
						if(this.Scene.actors[a].bodies[b].name == p.bodyB){
							p.bodyB = b;
						}
					}
				}
			}		
		}
		
		
		if(!p.hasOwnProperty('type')){p.type = "distance";};
		switch(p.type){
			case "distance":
				if(!p.hasOwnProperty('jointName')){p.jointName = "newJoint";};
				if(!p.hasOwnProperty('frequencyHz')){p.frequencyHz = 0;};
				if(!p.hasOwnProperty('dampingRatio')){p.dampingRatio = 0;};
				if(!p.hasOwnProperty('collideConnected')){p.collideConnected = false;};
				
				var newJoint = new FLAGJOINT(this.Scene.actors[p.actorA],p.jointName,p.type,this.Scene.actors[p.actorA].bodies[p.bodyA],this.Scene.actors[p.actorB].bodies[p.bodyB])
				newJoint.fb2Joint = new b2DistanceJointDef();
				
				var fb2Body = this.Scene.actors[p.actorA].bodies[p.bodyA].fb2Body;
				var theBodyB = this.Scene.actors[p.actorB].bodies[p.bodyB].fb2Body;				
				newJoint.jointDef.Initialize(fb2Body,theBodyB,fb2Body.GetWorldCenter(),theBodyB.GetWorldCenter());
				newJoint.jointDef.frequencyHz = p.frequencyHz;
				newJoint.jointDef.dampingRatio = p.dampingRatio;
				newJoint.jointDef.collideConnected = p.collideConnected;
				newJoint.fb2Joint = this.Box2D.world.CreateJoint(newJoint.jointDef);
				break;
			case "revolve":
				if(!p.hasOwnProperty('jointName')){p.jointName = "newJoint";};
				if(!p.hasOwnProperty('motorSpeed')){p.motorSpeed = 0;};
				if(!p.hasOwnProperty('maxMotorTorque')){p.maxMotorTorque = 64;};
				if(!p.hasOwnProperty('enableMotor')){p.enableMotor = true;};
				if(!p.hasOwnProperty('lowerAngle')){p.lowerAngle = 0;};
				if(!p.hasOwnProperty('upperAngle')){p.upperAngle = 0;};
				if(!p.hasOwnProperty('enableLimit')){p.enableLimit = false;};
				if(!p.hasOwnProperty('collideConnected')){p.collideConnected = false;};
				if(!p.hasOwnProperty('anchor')){p.anchor = 1;};
				
				var fb2Body = this.Scene.actors[p.actorA].bodies[p.bodyA].fb2Body;
				var theBodyB = this.Scene.actors[p.actorB].bodies[p.bodyB].fb2Body;	
				//is the anchor at the center of body 1 (lever) or body 2 (wheel)
				if(p.anchor == 1){
					var anchor = fb2Body.GetWorldCenter();
				}else if(p.anchor == 2){
					var anchor = theBodyB.GetWorldCenter();
				}
				
				var newJoint = new FLAGJOINT(this.Scene.actors[p.actorA],p.jointName,p.type,this.Scene.actors[p.actorA].bodies[p.bodyA],this.Scene.actors[p.actorB].bodies[p.bodyB])
				newJoint.fb2Joint = new b2RevoluteJointDef();
				
				newJoint.jointDef.Initialize(fb2Body,theBodyB,fb2Body.GetWorldCenter(),theBodyB.GetWorldCenter());
				newJoint.jointDef.motorSpeed = p.motorSpeed;
				newJoint.jointDef.maxMotorTorque = p.maxMotorTorque;
				newJoint.jointDef.enableMotor = p.enableMotor;
				newJoint.jointDef.lowerAngle = p.lowerAngle*(Math.PI/180);
				newJoint.jointDef.upperAngle = p.upperAngle*(Math.PI/180);
				newJoint.jointDef.enableLimit = p.enableLimit;
				newJoint.jointDef.collideConnected = p.collideConnected;
				newJoint.jointDef.userData.anchor = anchor;
				newJoint.fb2Joint = this.Box2D.world.CreateJoint(newJoint.jointDef);
				break;
		}
	}
}
//------------------------------------------------------------------
//END ADD JOINT


//ADD SPRITE
//Add a sprite to the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.addSprite = function(spriteName,instanceName,p){
	if(typeof p != "object"){var p={x:0,y:0,animation:null,frame:0,layer:0,playing:true,alpha:1,gui:false};};
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('animation')){p.animation = null;};
	if(!p.hasOwnProperty('frame')){p.frame = 0;};
	if(!p.hasOwnProperty('layer')){p.layer = 0;};
	if(!p.hasOwnProperty('playing')){p.playing = true;};
	if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
	if(!p.hasOwnProperty('gui')){p.gui = false;};
	if(p.layer >= this.Scene.layers.length){p.layer = 0;};
	
	//rearrange p so animation always comes before frame
	//in case user sets frame first, and give animation as name
	//animation must be first turned into index
	p = {x:p.x,y:p.y,animation:p.animation,frame:p.frame,layer:p.layer,playing:p.playing,alpha:p.alpha,gui:p.gui};
					
	//find the name of the sprite
	var numSpriteSheets = this.Scene.spriteSheets.length;
	for(var d=0;d<numSpriteSheets;d++){
		if(this.Scene.spriteSheets[d].name == spriteName){
				//check the animation and frame properties
				for (var property in p) {
					switch(property){
						case "animation":
							//if the animation is given as a name
							if(isNaN(p[property]) == true){
								//find the number that matches the name in the tiledObjectSheets
								var numAnimations = this.Scene.spriteSheets[d].animations.length;
								var animationFound = false;
								for(var a=0;a<numAnimations;a++){
									if(p[property] == this.Scene.spriteSheets[d].animations[a].name){
										p[property] = a;
										animationFound = true;
									}
								}
								if(animationFound == false){
									p[property] = null;
								}
							//if the animation is given as a number
							}else{
								var numAnimations = this.Scene.spriteSheets[d].animations.length;
								if(p[property] < numAnimations){
								}else{
									p[property] = null;
								}
							}
							break;
						case "frame":
							//if an animation exists
							if(p.animation != null){
								//if the frame is given as a name
								if(isNaN(p[property]) == true){
									if(p[property] == "startFrame"){
										p[property] = Number(this.Scene.spriteSheets[d].animations[p.animation].startFrame);
									}else if(p[property] == "endFrame"){
										p[property] = Number(this.Scene.spriteSheets[d].animations[p.animation].endFrame);
									}
								//if frame is given as number
								}else{
									if(p[property] > Number(this.Scene.spriteSheets[d].animations[p.animation].endFrame)){
										p[property] = Number(this.Scene.spriteSheets[d].animations[p.animation].endFrame);
									}
								}
							//if no animation exists
							}else{
								//does frame exist
								if(p[property] < (this.Scene.spriteSheets[d].tilesWide * this.Scene.spriteSheets[d].tilesHigh)){
									//frame exists
								}else{
									//frame given does not exists, reset to 0
									p[property] = 0;
								}
							}
							break;
					}
				}
				
				this.Scene.sprites.push(new FLAGSPRITE(instanceName,Number(d),p.x,p.y,p.frame,p.animation,p.layer,p.playing,p.alpha,p.gui));
		}
	}
}
//------------------------------------------------------------------
//END ADD SPRITE


//ADD TILED OBJECT
//Adds a tiled object to the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.addTiledObject = function(tiledObjectName,instanceName,p){
	if(typeof p != "object"){var p={row:0,col:0,animation:null,frame:0,layer:0};};
	if(!p.hasOwnProperty('row')){p.row = 0;};
	if(!p.hasOwnProperty('col')){p.col = 0;};
	if(!p.hasOwnProperty('animation')){p.animation = null;};
	if(!p.hasOwnProperty('frame')){p.frame = 0;};
	if(!p.hasOwnProperty('layer')){p.layer = 0;};
	if(!p.hasOwnProperty('playing')){p.playing = true;};
	
	//search for the name of the tiled object
	var numTiledObjects = this.Scene.tiledObjectSheets.length;
	for(var to=0;to<numTiledObjects;to++){
		if(this.Scene.tiledObjectSheets[to].name == tiledObjectName){
			
			var numRows = this.Scene.tiledObjectSheets[to].rows;
			var numCols = this.Scene.tiledObjectSheets[to].cols;
			var row = Number(p.row);
			var col = Number(p.col);
			
			
			//check if tiledObject is within bounds of Map
			var tiledObjectOutofBounds = false;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					if(row+r >= this.Scene.Map.tilesHigh || col+c >= this.Scene.Map.tilesWide){
						tiledObjectOutofBounds = true;
					}
				}
			}
			
			if(tiledObjectOutofBounds == false){
		
				//check tiledObjectIDs to see if tiledObject already exists
				var tiledObjectExists = false;
				for(var r=0;r<numRows;r++){
					for(var c=0;c<numCols;c++){
						if(this.Scene.layers[p.layer].tiledObjectIDs[row+r][col+c] != 0){
							tiledObjectExists = true;
						}
					}
				}
				
				if(tiledObjectExists == false){
					
					//check the animation and frame properties
					for (var property in p) {
						switch(property){
							case "animation":
								//if the animation is given as a name
								if(isNaN(p[property]) == true){
									//find the number that matches the name in the tiledObjectSheets
									var numAnimations = this.Scene.tiledObjectSheets[to].animations.length;
									var animationFound = false;
									for(var a=0;a<numAnimations;a++){
										if(p[property] == this.Scene.tiledObjectSheets[to].animations[a].name){
											p[property] = a;
											animationFound = true;
										}
									}
									if(animationFound == false){
										p[property] = null;
									}
								//if the animation is given as a number
								}else{
									var numAnimations = this.Scene.tiledObjectSheets[to].animations.length;
									if(p[property] < numAnimations){
									}else{
										p[property] = null;
									}
								}
								break;
							case "frame":
								//if an animation exists
								if(p.animation != null){
									//if the frame is given as a name
									if(isNaN(p[property]) == true){
										if(p[property] == "startFrame"){
											p[property] = Number(this.Scene.tiledObjectSheets[to].animations[p.animation].startFrame);
										}else if(p[property] == "endFrame"){
											p[property] = Number(this.Scene.tiledObjectSheets[to].animations[p.animation].endFrame);
										}
									//if frame is given as number
									}else{
										if(p[property] > Number(this.Scene.tiledObjectSheets[to].animations[p.animation].endFrame)){
											p[property] = Number(this.Scene.tiledObjectSheets[to].animations[p.animation].endFrame);
										}
									}
								//if no animation exists
								}else{
									p[property] = 0;
								}
								break;
						}
					}
				
					//create the new tiled object in the scene
					this.Scene.includeTiledObject(instanceName,Number(to),Number(p.layer),Number(p.row),Number(p.col),p.animation,Number(p.frame));
				}
			}
		}	
	}
}
//------------------------------------------------------------------
//END ADD TILED OBJECT


//ADD TILE SPRITE
//------------------------------------------------------------------
FLAGENGINE.prototype.addTileSprite = function(tileSpriteName,instanceName,p){
	
	if(!p.hasOwnProperty('row')){p.row = 0;};
	if(!p.hasOwnProperty('col')){p.col = 0;};
	if(!p.hasOwnProperty('layer')){p.layer = 0;};
	if(!p.hasOwnProperty('playing')){p.playing = true;};
	
	if(tileSpriteName != null){
		//search for name in tileSheet animations
		var numTileSheets = this.Scene.tileSheets.length;
		for(var ts=0;ts<numTileSheets;ts++){
			var numAnimations = this.Scene.tileSheets[ts].animations.length;
			for(var a=0;a<numAnimations;a++){
				if(tileSpriteName == this.Scene.tileSheets[ts].animations[a].name){
			
					//search existing tileSprites to see if this tile already has a tileSprite
					var numTileSprites = this.Scene.tileSprites.length;
					var tileSpriteExists = false;
					for(var tp=0;tp<numTileSprites;tp++){
						if(this.Scene.tileSprites[tp].row == p.row && this.Scene.tileSprites[tp].col == p.col && this.Scene.tileSprites[tp].layer == p.layer){
							tileSpriteExists = true;
							var pIndex = ts;
							var animation = a;
							var frame = this.Scene.tileSheets[ts].animations[a].startFrame;
							this.Scene.tileSprites[tp].pIndex = pIndex;
							this.Scene.tileSprites[tp].animation = animation;
							this.Scene.tileSprites[tp].frame = frame;
							this.Scene.tileSprites[tp].playing = p.playing;
						} 
					}
				
					if(tileSpriteExists == false){
						var pIndex = ts;
						var animation = a;
						var frame = this.Scene.tileSheets[ts].animations[a].startFrame;					
						this.Scene.tileSprites.push(new FLAGTILESPRITE(instanceName,pIndex,p.row,p.col,animation,frame,p.layer,p.playing));
					}
				}
			}
		}
	}
}
//------------------------------------------------------------------
//END ADD TILE SPRITE


//BODIES CLICKED
//returns an list of objects, {actor:names of actors, bodies:[the names of bodies]} under a mouse click
//------------------------------------------------------------------
FLAGENGINE.prototype.bodiesClicked = function(){
	//an array to hold the names of the actors and their bodies clicked
	var actorsClicked = [];
	//get the mouse position
	var clickPoint = {x:this.Pointer.mapLoc.x, y:this.Pointer.mapLoc.y};
	//check all the actors
	var numActors = this.Scene.actors.length;
	for(var i=0;i<numActors;i++){
		var numBodies = this.Scene.actors[i].bodies.length;
		var clickedObject = {name:this.Scene.actors[i].name,bodies:[]};
		for(var j=0;j<numBodies;j++){
			var b = this.Scene.actors[i].bodies[j].fb2Body;
			var as = this.Scene.spriteSheets[this.Scene.actors[i].bodies[j].pIndex];
			//get the position of the body
			var x = ((b.GetPosition().x*this.Box2D.scale)+as.offset.x);
			var y = ((b.GetPosition().y*this.Box2D.scale)+as.offset.y);
			var actorPoint = {x:x, y:y};
			var actorRect = as.tileRects[this.Scene.actors[i].bodies[j].frame];
			
			//set up the rect to check
			var checkRect = {x:0,y:0,w:0,h:0};
			checkRect.x = actorPoint.x - ((actorRect.w/2)*this.scale);
			checkRect.y = actorPoint.y - ((actorRect.h/2)*this.scale);
			checkRect.w = actorRect.w*this.scale;
			checkRect.h = actorRect.h*this.scale;
			
			if(this.pointInRect(clickPoint,checkRect) == true){
				clickedObject.bodies.push(this.Scene.actors[i].bodies[j].name);
			}	
		}
		if(clickedObject.bodies.length > 0){
			actorsClicked.push({actor:clickedObject.name,bodies:clickedObject.bodies});
		}
	}
	return actorsClicked;
}
//------------------------------------------------------------------
//END BODY CLICKED


//CYCLE SPRITE FRAMES
//------------------------------------------------------------------
FLAGENGINE.prototype.cycleSpriteFrames = function(){
	
	//CYCLE TILE SPRITE FRAMES
	var numTileSprites = this.Scene.tileSprites.length;
	for(var i=0;i<numTileSprites;i++){
		var tiledSprite = this.Scene.tileSprites[i];
		//make sure tileSheet is right
		if(this.Scene.layers[tiledSprite.layer].tileSheetIDs[tiledSprite.row][tiledSprite.col] != tiledSprite.pIndex){
			this.Scene.layers[tiledSprite.layer].tileSheetIDs[tiledSprite.row][tiledSprite.col] = tiledSprite.pIndex;
		}
		//make sure tile fits inside animation
		if(this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] < this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].startFrame){
			this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] = this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].startFrame;
		}else if(this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] > this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].endFrame){
			this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] = this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].endFrame;
		}
	
		if(this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] < this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].endFrame){
			if(tiledSprite.playing == true){
				this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] += 1;
			}		
		//check if the tile sprite is set to loop	
		}else if(tiledSprite.loop == true  && tiledSprite.playing == true){
			//is there a loop count
			if(tiledSprite.loopCount != null){
				//add one to the loops
				tiledSprite.loops += 1;
				//is number of times it has looped less than the loop count
				if(tiledSprite.loops < tiledSprite.loopCount){
					//loop back to the beginning of the animation
					this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] = this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].startFrame;				
				}else{
					//stop the animation
					tiledSprite.stop();
				}
			}else{
				//loop back to the beginning of the animation
				this.Scene.layers[tiledSprite.layer].tileIDs[tiledSprite.row][tiledSprite.col] = this.Scene.tileSheets[tiledSprite.pIndex].animations[tiledSprite.animation].startFrame;
			}				
		}else{
			//stop the animation
			tiledSprite.stop();			
		}
	}
	
	//CYCLE TILE OBJECT ANIMATIONS
	var numObjects = this.Scene.tiledObjects.length;
	for(var i=0;i<numObjects;i++){
		var tiledObject = this.Scene.tiledObjects[i];
		if(tiledObject.animation != null && tiledObject.playing == true){
			//cycle the tile object's animation frames 
			if(tiledObject.frame < this.Scene.tiledObjectSheets[tiledObject.pIndex].animations[tiledObject.animation].endFrame){
				tiledObject.frame += 1;				
			//check if the tiled object is set to loop	
			}else if(tiledObject.loop == true){
				//is there a loop count
				if(tiledObject.loopCount != null){
					//add one to the loops
					tiledObject.loops += 1;
					//is number of times it has looped less than the loop count
					if(tiledObject.loops < tiledObject.loopCount){
						//loop back to the beginning of the animation
						tiledObject.frame = this.Scene.tiledObjectSheets[tiledObject.pIndex].animations[tiledObject.animation].startFrame;					
					}else{
						//stop the animation
						tiledObject.stop();
					}
				}else{
					//loop back to the beginning of the animation
					tiledObject.frame = this.Scene.tiledObjectSheets[tiledObject.pIndex].animations[tiledObject.animation].startFrame;					
				}				
			}else{
				//stop the animation
				tiledObject.stop();			
			}
		}
	}
	
	//CYCLE SPRITE FRAMES
	var numOfSprites = this.Scene.sprites.length;
	for(var s=0;s<numOfSprites;s++){
		var sprite = this.Scene.sprites[s];
		if(sprite.animation != null && sprite.playing == true){
			//cycle the scene's decal animation frames
			if(sprite.frame < this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].endFrame){
				sprite.frame += 1;	
			//check if the sprite itself is set to loop	
			}else if(sprite.loop == true){
				//is there a loop count
				if(sprite.loopCount != null){
					//add one to the loops
					sprite.loops += 1;
					//is number of times it has looped less than the loop count
					if(sprite.loops < sprite.loopCount){
						//loop back to the beginning of the animation
						sprite.frame = this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].startFrame;						
					}else{
						//stop the animation
						sprite.stop();
					}
				}else{
					//loop back to the beginning of the animation
					sprite.frame = this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].startFrame;
				}				
			}else{
				//stop the animation
				sprite.stop();
			}
		}
		
		//SPRITE DECALS
		var numOfDecals = sprite.decals.length;
		for(var d=0;d<numOfDecals;d++){
			if(sprite.decals[d].animation != null && sprite.decals[d].playing == true){
				//cycle the actors' decal animation frames
				if(sprite.decals[d].frame < this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].endFrame){
					sprite.decals[d].frame += 1;					
				//check if the decal itself is set to loop	
				}else if(sprite.decals[d].loop == true){
					//is there a loop count
					if(sprite.decals[d].loopCount != null){
						//add one to the loops
						sprite.decals[d].loops += 1;
						//is number of times it has looped less than the loop count
						if(sprite.decals[d].loops < sprite.decals[d].loopCount){
							//loop back to the beginning of the animation
							sprite.decals[d].frame = this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].startFrame;					
						}else{
							//stop the animation
							sprite.decals[d].stop();
						}
					}else{
						//loop back to the beginning of the animation
						sprite.decals[d].frame = this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].startFrame;
					}				
				}else{
					//stop the animation
					sprite.decals[d].stop();
				}
			}
		}
	}
	
	//CYCLE ACTOR's BODY SPRITE FRAMES
	var numActors = this.Scene.actors.length;
	for(var i=0;i<numActors;i++){
		var numBodies = this.Scene.actors[i].bodies.length;
		var bodiesToKeep = [];
		var bodiesToDestroy = [];
		for(var j=0;j<numBodies;j++){
			var sprite = this.Scene.actors[i].bodies[j].Sprite;		
			if(sprite !== null){
				//BODY SPRITE
				if(sprite.animation != null && sprite.playing == true){
					//cycle the actors' animation frames 
					if(sprite.frame < this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].endFrame){
						sprite.frame += 1;					
					//check if the sprite itself is set to loop	
					}else if(sprite.loop == true){
						//is there a loop count
						if(sprite.loopCount != null){
							//add one to the loops
							sprite.loops += 1;
							//is number of times it has looped less than the loop count
							if(sprite.loops < sprite.loopCount){
								//loop back to the beginning of the animation
								sprite.frame = this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].startFrame;						
							}else{
								//stop the animation
								sprite.stop();
							}
						}else{
							//loop back to the beginning of the animation
							sprite.frame = this.Scene.spriteSheets[sprite.pIndex].animations[sprite.animation].startFrame;
						}				
					}else{
						//stop the animation
						sprite.stop();
					}
				}
		
				//BODY SPRITE DECALS
				var numOfDecals = sprite.decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(sprite.decals[d].animation != null && sprite.decals[d].playing == true){
						//cycle the actors' decal animation frames
						if(sprite.decals[d].frame < this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].endFrame){
							sprite.decals[d].frame += 1;
						//check if the decal itself is set to loop	
						}else if(sprite.decals[d].loop == true){
							//is there a loop count
							if(sprite.decals[d].loopCount != null){
								//add one to the loops
								sprite.decals[d].loops += 1;
								//is number of times it has looped less than the loop count
								if(sprite.decals[d].loops < sprite.decals[d].loopCount){
									//loop back to the beginning of the animation
									sprite.decals[d].frame = this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].startFrame;					
								}else{
									//stop the animation
									sprite.decals[d].stop();
								}
							}else{
								//loop back to the beginning of the animation
								sprite.decals[d].frame = this.Scene.spriteSheets[sprite.decals[d].pIndex].animations[sprite.decals[d].animation].startFrame;
							}				
						}else{
							//stop the animation
							sprite.decals[d].stop();
						}
					}
				}
			}
		}
	}
}
//------------------------------------------------------------------
//END CYCLE SPRITE FRAMES


//DRAW
//------------------------------------------------------------------
FLAGENGINE.prototype.draw = function(){
	//CLEAR
	this.Context.save();
	this.Context.setTransform(1,0,0,1,0,0);
	this.Context.clearRect(0,0,this.Context.canvas.width,this.Context.canvas.height);
	//BACKGROUND COLOR
	this.Context.fillStyle = "#" + this.Scene.bgColor.toString();		
	this.Context.fillRect(0,0,this.Context.canvas.width,this.Context.canvas.height);
	this.Context.restore();

	this.Context.save();
	this.Context.scale(this.Scene.scale,this.Scene.scale);
	this.Context.translate(this.Scene.Map.x,this.Scene.Map.y);	
	
	//counts for draw
	var numOfActors = this.Scene.actors.length;	
	var numLayers = this.Scene.layers.length;	
	switch(this.Scene.Map.type){
		case "orthogonal":
			
			this.Context.globalAlpha = 1;
					
			//BACKGROUND IMAGE DRAW
			if(this.Scene.bgImage != null){
				this.Context.drawImage(this.Scene.bgImage,0,0,this.Scene.bgImage.width,this.Scene.bgImage.height,-this.Scene.Map.x,-this.Scene.Map.y,this.Scene.bgImage.width,this.Scene.bgImage.height);
			}
			
			//TILE DRAW
			for(var k=0;k<numLayers;k++){
				if(this.Scene.layers[k].visible == true && this.Scene.layers[k].alpha > 0){	
					this.Context.globalAlpha = this.Scene.layers[k].alpha;		
					
					//preRender?
					if(this.Scene.layers[k].preRender.on == true){
						//has it been drawn
						if(this.Scene.layers[k].canvas != null){
							//copy the preRender canvas to the Scene
							this.Context.drawImage(this.Scene.layers[k].canvas,Math.floor(-this.Scene.layers[k].trans.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)),Math.floor(this.Scene.layers[k].trans.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y)));
							
							//render actors and sprites
							for (var i=this.Scene.layers[k].drawTileBounds.row.first; i<this.Scene.layers[k].drawTileBounds.row.last; i++){
								for (var j=this.Scene.layers[k].drawTileBounds.col.first; j<this.Scene.layers[k].drawTileBounds.col.last; j++){	
								
									//ACTOR DRAW
									this.drawActors(numOfActors,i,j,k);
							
									//SPRITES DRAW
									this.drawSprites(i,j,k);
								}
							}	
							
						}else{
							//create the canvas
							this.Scene.layers[k].canvas = document.createElement('canvas');
							this.Scene.layers[k].canvas.width = this.Scene.Map.w;
							this.Scene.layers[k].canvas.height = this.Scene.Map.h;
							this.Scene.layers[k].ctx = this.Scene.layers[k].canvas.getContext("2d");
							
							//a translation so the context can be rendered correctly
							this.Scene.layers[k].trans = {x:0,y:0};
							this.Scene.layers[k].trans.x = 0;
							//set the yAdjust to accommodate highest tiled object
							this.Scene.layers[k].trans.y = 0;
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											if(Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight) < this.Scene.layers[k].trans.y){
												this.Scene.layers[k].trans.y = Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight);
											}
										}
									}
								}
							}
							
							//translate the preRender context over the yAdjust
							this.Scene.layers[k].ctx.translate(this.Scene.layers[k].trans.x,-this.Scene.layers[k].trans.y);
							
							//draw the preRender canvas
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										//check for tile object
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight)};		
											this.Scene.layers[k].ctx.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}else{	
											var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];	
											var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y)};		
											this.Scene.layers[k].ctx.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}
									}
								}
							}
						}
						
					//no preRender
					}else{
						//keep the layer canvas null when preRender is shut off
						this.Scene.layers[k].canvas = null;
					
						for (var i=this.Scene.layers[k].drawTileBounds.row.first; i<this.Scene.layers[k].drawTileBounds.row.last; i++){
							for (var j=this.Scene.layers[k].drawTileBounds.col.first; j<this.Scene.layers[k].drawTileBounds.col.last; j++){										
								var tileIDNum = this.Scene.layers[k].tileIDs[i][j];	
								if(tileIDNum != 0){
									//check for tile object
									if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
										var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
										var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y + this.Scene.layers[k].offset.y - rect.h + this.Scene.Map.tileHeight + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};		
										this.Context.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
									}else{	
										var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];	
										var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};		
										this.Context.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
									}
								}
							
								//ACTOR DRAW
								this.drawActors(numOfActors,i,j,k);
							
								//SPRITES DRAW
								this.drawSprites(i,j,k);
						};};
					}					
				}
			};
			
			this.Context.globalAlpha = 1;
			
			//DEBUG DRAW - BOX 2D
			if(this.Box2D.debug == true){this.Box2D.world.DrawDebugData();};	
			
			//WALKABLES DRAW
			this.Context.globalAlpha = this.Walkables.alpha;
			if(this.Walkables.on == true){
				for (var i=this.tilesToDraw.row.first; i<this.tilesToDraw.row.last; i++){
					for (var j=this.tilesToDraw.col.first; j<this.tilesToDraw.col.last; j++){	
						var x = this.Scene.Map.gridPoints[i][j].x;
						var y = this.Scene.Map.gridPoints[i][j].y;
						this.Context.beginPath();
						this.Context.rect(x,y,this.Scene.Map.tileWidth,this.Scene.Map.tileHeight);
						if(this.Scene.walkableTiles[i][j] == 0){
							this.Context.fillStyle = this.Walkables.color_0;
						}else if(this.Scene.walkableTiles[i][j] == 1){
							this.Context.fillStyle = this.Walkables.color_1;
						}
						this.Context.fill();
					}
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//GRID DRAW
			if(this.Grid.on == true){
				this.Context.globalAlpha = this.Grid.alpha;
				for (var i=this.tilesToDraw.row.first; i<this.tilesToDraw.row.last; i++){
					for (var j=this.tilesToDraw.col.first; j<this.tilesToDraw.col.last; j++){	
						this.Context.strokeStyle = this.Grid.color;
						var x = this.Scene.Map.gridPoints[i][j].x;
						var y = this.Scene.Map.gridPoints[i][j].y;
						this.Context.lineWidth = this.Grid.width;
						this.Context.strokeRect(x,y,this.Scene.Map.tileWidth,this.Scene.Map.tileHeight);
					}
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//TILE CURSOR IMAGE
			if(this.Cursor.image != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				this.Context.drawImage(this.Cursor.image,this.Cursor.rect.x,this.Cursor.rect.y,this.Cursor.rect.w,this.Cursor.rect.h,this.Cursor.point.x,this.Cursor.point.y,this.Cursor.rect.w,this.Cursor.rect.h);
			}
			if(this.Cursor.images != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				var numImages = this.Cursor.images.length;
				if(numImages > 0){
					for(var i=0;i<numImages;i++){
						this.Context.drawImage(this.Cursor.images[i].image,this.Cursor.images[i].rect.x,this.Cursor.images[i].rect.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h,this.Cursor.images[i].point.x,this.Cursor.images[i].point.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h);
					}
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//TILE CURSOR DRAW
			if(this.Cursor.on == true && this.Cursor.tiles != null){
				this.Context.globalAlpha = this.Cursor.tileAlpha;
				var numTiles = this.Cursor.tiles.length;
				for(var t=0;t<numTiles;t++){
					if(this.Cursor.tiles[t].row >= 0 && this.Cursor.tiles[t].row < this.Scene.Map.tilesHigh && this.Cursor.tiles[t].col >= 0 && this.Cursor.tiles[t].col < this.Scene.Map.tilesWide){
						this.Context.strokeStyle = this.Cursor.tiles[t].color || "#00ff00";
						var x = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].x;
						var y = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].y;
						this.Context.lineWidth = this.Cursor.tiles[t].width || 1;
						this.Context.strokeRect(x,y,this.Scene.Map.tileWidth,this.Scene.Map.tileHeight);
						
			};};};
			
			this.Context.globalAlpha = 1;
			
			//GUI SPRITES DRAW
			this.drawSprites_GUI();	
						
			this.Context.restore();	
			break;
		case "isometric":
			
			this.Context.globalAlpha = 1;
					
			//BACKGROUND IMAGE DRAW
			if(this.Scene.bgImage != null){
				this.Context.drawImage(this.Scene.bgImage,0,0,this.Scene.bgImage.width,this.Scene.bgImage.height,-this.Scene.Map.x,-this.Scene.Map.y,this.Scene.bgImage.width,this.Scene.bgImage.height);
			}
		
			//TILE DRAW			
			for(var k=0;k<numLayers;k++){	
				var numTiles = this.Scene.layers[k].tilesToDrawIso.length;
				if(this.Scene.layers[k].visible == true && this.Scene.layers[k].alpha > 0){	
					this.Context.globalAlpha = this.Scene.layers[k].alpha;
					
					//preRender?
					if(this.Scene.layers[k].preRender.on == true){
						//has it been drawn
						if(this.Scene.layers[k].canvas != null){
							//copy the preRender canvas to the Scene
							this.Context.drawImage(this.Scene.layers[k].canvas,Math.floor(-this.Scene.layers[k].trans.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)),Math.floor(this.Scene.layers[k].trans.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y)));

							
							//render actors and sprites
							for(var t=0;t<numTiles;t++){
								var i = this.Scene.layers[k].tilesToDrawIso[t].row;	
								var j = this.Scene.layers[k].tilesToDrawIso[t].col;
								//ACTOR DRAW
								this.drawActors(numOfActors,i,j,k);
						
								//SPRITES DRAW
								this.drawSprites(i,j,k);
							}	
							
						}else{
							//create the canvas
							this.Scene.layers[k].canvas = document.createElement('canvas');
							this.Scene.layers[k].canvas.width = this.Scene.Map.w;
							this.Scene.layers[k].canvas.height = this.Scene.Map.h;
							this.Scene.layers[k].ctx = this.Scene.layers[k].canvas.getContext("2d");
							
							//a translation so the context can be rendered correctly
							this.Scene.layers[k].trans = {x:0,y:0};
							//move over half the map width to allow for the negative side of the Grid
							this.Scene.layers[k].trans.x = this.Scene.Map.w/2;
							//set the yAdjust to accommodate highest tiled object
							this.Scene.layers[k].trans.y = 0;
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											if(Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight) < this.Scene.layers[k].trans.y){
												this.Scene.layers[k].trans.y = Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight);
											}
										}
									}
								}
							}
							
							//translate the preRender context over half the map width and the yAdjust
							this.Scene.layers[k].ctx.translate(this.Scene.layers[k].trans.x,-this.Scene.layers[k].trans.y);
							
							//draw the preRender canvas
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										//check for tile object
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											var point = {x:Math.floor(this.Scene.Map.gridPoints[i][j].x - (this.Scene.Map.tileWidth/2) + this.Scene.layers[k].offset.x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight) + this.Scene.layers[k].offset.y};
											this.Scene.layers[k].ctx.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}else{
											var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];
											var point = {x:Math.floor(this.Scene.Map.gridPoints[i][j].x - (this.Scene.Map.tileWidth/2) + this.Scene.layers[k].offset.x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y - rect.h + this.Scene.Map.tileHeight + this.Scene.layers[k].offset.y)};
											this.Scene.layers[k].ctx.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}
									}
								}
							}
						}
						
					//no preRender
					}else{
						//keep the layer canvas null when preRender is shut off
						this.Scene.layers[k].canvas = null;
						
						for(var t=0;t<numTiles;t++){
							var i = this.Scene.layers[k].tilesToDrawIso[t].row;	
							var j = this.Scene.layers[k].tilesToDrawIso[t].col;		
							var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
							if(tileIDNum != 0){
								//check for tile object
								if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){
									var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
									var point = {x:Math.floor(this.Scene.Map.gridPoints[i][j].x - (this.Scene.Map.tileWidth/2) + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y - rect.h + this.Scene.Map.tileHeight + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};
									this.Context.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
								}else{
									var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum];
									var point = {x:Math.floor(this.Scene.Map.gridPoints[i][j].x - (this.Scene.Map.tileWidth/2) + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y - rect.h + this.Scene.Map.tileHeight + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};
									this.Context.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
								}
							};
						
							//ACTOR DRAW
							this.drawActors(numOfActors,i,j,k);
						
							//SPRITES DRAW
							this.drawSprites(i,j,k);
						}
					}
			};};
			
			this.Context.globalAlpha = 1;
			
			//DEBUG DRAW  - BOX2D
			if(this.Box2D.debug == true){this.Box2D.world.DrawDebugData();};
			
			//numTiles from standard tilesToDrawIso
			var numTiles = this.tilesToDrawIso.length;
			
			//WALKABLES DRAW
			this.Context.globalAlpha = this.Walkables.alpha;
			if(this.Walkables.on == true){
				for(var t=0;t<numTiles;t++){
					var i = this.tilesToDrawIso[t].row;	
					var j = this.tilesToDrawIso[t].col;	
					if(this.Scene.walkableTiles[i][j] == 0){
						this.Context.fillStyle = this.Walkables.color_0;
					}else if(this.Scene.walkableTiles[i][j] == 1){
						this.Context.fillStyle = this.Walkables.color_1;
					}
					var x = this.Scene.Map.gridPoints[i][j].x;
					var y = this.Scene.Map.gridPoints[i][j].y;
					this.Context.beginPath();
					this.Context.moveTo(x,y);
					this.Context.lineTo(x+(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
					this.Context.lineTo(x,y+(this.Scene.Map.tileHeight));
					this.Context.lineTo(x-(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
					this.Context.closePath();
					this.Context.fill();
				}
			}	
			
			this.Context.globalAlpha = 1;
			
			//GRID DRAW
			if(this.Grid.on == true){
				this.Context.globalAlpha = this.Grid.alpha;
				for(var t=0;t<numTiles;t++){
					var i = this.tilesToDrawIso[t].row;	
					var j = this.tilesToDrawIso[t].col;		
					this.Context.strokeStyle = this.Grid.color;
					var x = this.Scene.Map.gridPoints[i][j].x;
					var y = this.Scene.Map.gridPoints[i][j].y;
					this.Context.beginPath();
					this.Context.moveTo(x,y);
					this.Context.lineTo(x+(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
					this.Context.lineTo(x,y+(this.Scene.Map.tileHeight));
					this.Context.lineTo(x-(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
					this.Context.closePath();
					this.Context.lineWidth = this.Grid.width;
					this.Context.stroke();
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//TILE CURSOR IMAGE
			if(this.Cursor.image != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				this.Context.drawImage(this.Cursor.image,this.Cursor.rect.x,this.Cursor.rect.y,this.Cursor.rect.w,this.Cursor.rect.h,this.Cursor.point.x,this.Cursor.point.y,this.Cursor.rect.w,this.Cursor.rect.h);
			}
			if(this.Cursor.images != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				var numImages = this.Cursor.images.length;
				if(numImages > 0){
					for(var i=0;i<numImages;i++){
						this.Context.drawImage(this.Cursor.images[i].image,this.Cursor.images[i].rect.x,this.Cursor.images[i].rect.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h,this.Cursor.images[i].point.x,this.Cursor.images[i].point.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h);
					}
				}
			}
			
			this.Context.globalAlpha = 1;
						
			//TILE CURSOR DRAW			
			if(this.Cursor.on == true && this.Cursor.tiles != null){
				this.Context.globalAlpha = this.Cursor.tileAlpha;
				var numTiles = this.Cursor.tiles.length;
				for(var t=0;t<numTiles;t++){
					if(this.Cursor.tiles[t].row >= 0 && this.Cursor.tiles[t].row < this.Scene.Map.tilesHigh && this.Cursor.tiles[t].col >= 0 && this.Cursor.tiles[t].col < this.Scene.Map.tilesWide){
						this.Context.strokeStyle = this.Cursor.tiles[t].color || "#00ff00";
						var x = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].x;
						var y = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].y;
						this.Context.beginPath();
						this.Context.moveTo(x,y);
						this.Context.lineTo(x+(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
						this.Context.lineTo(x,y+(this.Scene.Map.tileHeight));
						this.Context.lineTo(x-(this.Scene.Map.tileWidth/2),y+(this.Scene.Map.tileHeight/2));
						this.Context.closePath();
						this.Context.lineWidth = this.Cursor.tiles[t].width || 1;
						this.Context.stroke();
			};};};
			
			this.Context.globalAlpha = 1;
			
			//GUI SPRITES DRAW
			this.drawSprites_GUI();
			
			this.Context.restore();	
			break;
		case "hexagonal":
		
			this.Context.globalAlpha = 1;
			
			//BACKGROUND IMAGE DRAW
			if(this.Scene.bgImage != null){
				this.Context.drawImage(this.Scene.bgImage,0,0,this.Scene.bgImage.width,this.Scene.bgImage.height,-this.Scene.Map.x,-this.Scene.Map.y,this.Scene.bgImage.width,this.Scene.bgImage.height);
			}
			
			//TILE DRAW	
			for(var k=0;k<numLayers;k++){
				if(this.Scene.layers[k].visible == true && this.Scene.layers[k].alpha > 0){	
					this.Context.globalAlpha = this.Scene.layers[k].alpha;		
					
					//preRender?
					if(this.Scene.layers[k].preRender.on == true){
						//has it been drawn
						if(this.Scene.layers[k].canvas != null){
							//copy the preRender canvas to the Scene
							this.Context.drawImage(this.Scene.layers[k].canvas,Math.floor(-this.Scene.layers[k].trans.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)),Math.floor(this.Scene.layers[k].trans.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y)));
							
							//render actors and sprites
							for (var i=this.Scene.layers[k].drawTileBounds.row.first; i<this.Scene.layers[k].drawTileBounds.row.last; i++){
								for (var j=this.Scene.layers[k].drawTileBounds.col.first; j<this.Scene.layers[k].drawTileBounds.col.last; j++){	
								
									//ACTOR DRAW
									this.drawActors(numOfActors,i,j,k);
							
									//SPRITES DRAW
									this.drawSprites(i,j,k);
								}
							}	
							
						}else{
							//create the canvas
							this.Scene.layers[k].canvas = document.createElement('canvas');
							this.Scene.layers[k].canvas.width = this.Scene.Map.w;
							this.Scene.layers[k].canvas.height = this.Scene.Map.h;
							this.Scene.layers[k].ctx = this.Scene.layers[k].canvas.getContext("2d");
							
							//a translation so the context can be rendered correctly
							this.Scene.layers[k].trans = {x:0,y:0};
							this.Scene.layers[k].trans.x = 0;
							//set the yAdjust to accommodate highest tiled object
							this.Scene.layers[k].trans.y = 0;
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											if(Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight) < this.Scene.layers[k].trans.y){
												this.Scene.layers[k].trans.y = Math.floor(this.Scene.Map.gridPoints[i][j].y-rect.h+this.Scene.Map.tileHeight);
											}
										}
									}
								}
							}
							
							//translate the preRender context over the yAdjust
							this.Scene.layers[k].ctx.translate(this.Scene.layers[k].trans.x,-this.Scene.layers[k].trans.y);
							
							//draw the preRender canvas
							for(var i=0;i<this.Scene.Map.tilesHigh;i++){
								for(var j=0;j<this.Scene.Map.tilesWide;j++){	
									var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
									if(tileIDNum != 0){
										//check for tile object
										if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
											var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
											if(	j % 2 != 1){
												var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y - rect.h + this.Scene.Map.tileHeight)};		
											}else{
												var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y - rect.h + this.Scene.Map.tileHeight)-(this.Scene.Map.tileHeight/2)};		
											}
											this.Scene.layers[k].ctx.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}else{	
											var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum]
											var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x), y:Math.floor(this.Scene.Map.gridPoints[i][j].y)};	
											this.Scene.layers[k].ctx.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
										}
									}
								}
							}							
						}
						
					//no preRender
					}else{
						//keep the layer canvas null when preRender is shut off
						this.Scene.layers[k].canvas = null;

						for (var i=this.Scene.layers[k].drawTileBounds.row.first; i<this.Scene.layers[k].drawTileBounds.row.last; i++){
							for (var j=this.Scene.layers[k].drawTileBounds.col.first; j<this.Scene.layers[k].drawTileBounds.col.last; j++){										
								var tileIDNum = this.Scene.layers[k].tileIDs[i][j];
								if(tileIDNum != 0){
									//check for tile object
									if(this.Scene.layers[k].tiledObjectIDs[i][j] != 0){	
										var rect = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].tileRects[this.Scene.tiledObjects[(this.Scene.layers[k].tiledObjectIDs[i][j])-1].frame][tileIDNum];
										if(	j % 2 != 1){
											var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y + this.Scene.layers[k].offset.y - rect.h + this.Scene.Map.tileHeight + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};		
										}else{
											var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y + this.Scene.layers[k].offset.y - rect.h + this.Scene.Map.tileHeight + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))-(this.Scene.Map.tileHeight/2)};		
										}
										this.Context.drawImage(this.Scene.tiledObjectSheets[this.Scene.tiledObjects[this.Scene.layers[k].tiledObjectIDs[i][j]-1].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
									}else{	
										var rect = this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].tileRects[tileIDNum]
										var point =	{x:Math.floor(this.Scene.Map.gridPoints[i][j].x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x)), y:Math.floor(this.Scene.Map.gridPoints[i][j].y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))};	
										this.Context.drawImage(this.Scene.tileSheets[this.Scene.layers[k].tileSheetIDs[i][j]].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
									}
								}
							
								//ACTOR DRAW
								this.drawActors(numOfActors,i,j,k);
							
								//SPRITES DRAW
								this.drawSprites(i,j,k);
							}
						}
					}
			};};
			
			this.Context.globalAlpha = 1;
						
			//DEBUG DRAW - BOX 2D
			if(this.Box2D.debug == true){this.Box2D.world.DrawDebugData();};
			
			//WALKABLES DRAW
			this.Context.globalAlpha = this.Walkables.alpha;
			if(this.Walkables.on == true){
				for (var i=this.tilesToDraw.row.first; i<this.tilesToDraw.row.last; i++){
					for (var j=this.tilesToDraw.col.first; j<this.tilesToDraw.col.last; j++){
						if(this.Scene.walkableTiles[i][j] == 0){
							this.Context.fillStyle = this.Walkables.color_0;
						}else if(this.Scene.walkableTiles[i][j] == 1){
							this.Context.fillStyle = this.Walkables.color_1;
						}
						var x = this.Scene.Map.gridPoints[i][j].x;
						var y = this.Scene.Map.gridPoints[i][j].y;
						this.Context.beginPath();
						this.Context.moveTo((x+(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x+(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.closePath();
						this.Context.fill();	
					}
				}
			}
			
			this.Context.globalAlpha = 1;	
			
			//GRID DRAW
			if(this.Grid.on == true){
				this.Context.globalAlpha = this.Grid.alpha;
				for (var i=this.tilesToDraw.row.first; i<this.tilesToDraw.row.last; i++){
					for (var j=this.tilesToDraw.col.first; j<this.tilesToDraw.col.last; j++){
						this.Context.strokeStyle = this.Grid.color;
						var x = this.Scene.Map.gridPoints[i][j].x;
						var y = this.Scene.Map.gridPoints[i][j].y;
						this.Context.beginPath();
						this.Context.moveTo((x+(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x+(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.closePath();
						this.Context.lineWidth = this.Grid.width;
						this.Context.stroke();	
					}
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//TILE CURSOR IMAGE
			if(this.Cursor.image != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				this.Context.drawImage(this.Cursor.image,this.Cursor.rect.x,this.Cursor.rect.y,this.Cursor.rect.w,this.Cursor.rect.h,this.Cursor.point.x,this.Cursor.point.y,this.Cursor.rect.w,this.Cursor.rect.h);
			}
			if(this.Cursor.images != null){
				this.Context.globalAlpha = this.Cursor.imageAlpha;
				var numImages = this.Cursor.images.length;
				if(numImages > 0){
					for(var i=0;i<numImages;i++){
						this.Context.drawImage(this.Cursor.images[i].image,this.Cursor.images[i].rect.x,this.Cursor.images[i].rect.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h,this.Cursor.images[i].point.x,this.Cursor.images[i].point.y,this.Cursor.images[i].rect.w,this.Cursor.images[i].rect.h);
					}
				}
			}
			
			this.Context.globalAlpha = 1;
			
			//TILE CURSOR DRAW			
			if(this.Cursor.on == true && this.Cursor.tiles != null){
				this.Context.globalAlpha = this.Cursor.tileAlpha;
				var numTiles = this.Cursor.tiles.length;
				for(var t=0;t<numTiles;t++){
					if(this.Cursor.tiles[t].row >= 0 && this.Cursor.tiles[t].row < this.Scene.Map.tilesHigh && this.Cursor.tiles[t].col >= 0 && this.Cursor.tiles[t].col < this.Scene.Map.tilesWide){
						this.Context.strokeStyle = this.Cursor.tiles[t].color || "#00ff00";
						var x = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].x;
						var y = this.Scene.Map.gridPoints[this.Cursor.tiles[t].row][this.Cursor.tiles[t].col].y;
						this.Context.beginPath();
						this.Context.moveTo((x+(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y));
						this.Context.lineTo((x+this.Scene.Map.tileWidth),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.lineTo((x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x+(this.Scene.Map.tileWidth/4)),(y+(this.Scene.Map.tileHeight)));
						this.Context.lineTo((x),(y+(this.Scene.Map.tileHeight/2)));
						this.Context.closePath();
						this.Context.lineWidth = this.Cursor.tiles[t].width || 1;
						this.Context.stroke();	
			};};};
			
			this.Context.globalAlpha = 1;
			
			//GUI SPRITES DRAW
			this.drawSprites_GUI();
			
			this.Context.restore();	
			break;
		default:
			break;
	};
	
	//FPS
	var thisLoop = new Date;
    this.FPS.now = Math.floor(1000 / (thisLoop - this.FPS.prev));
    this.FPS.prev = thisLoop;
	//calculate average FPS
	this.FPS.avgA.push(this.FPS.now);
	if(this.FPS.avgA.length > 60){
		this.FPS.avgA.shift();
	}
	var lengthOfAvg = this.FPS.avgA.length;
	var totalAvgFPS = 0;
	for(var i=0;i<lengthOfAvg;i++){
		totalAvgFPS += this.FPS.avgA[i];
	}
	this.FPS.avg = Math.floor(totalAvgFPS/lengthOfAvg);
};

FLAGENGINE.prototype.drawActors = function(numOfActors,i,j,layer){	
	for(r=0;r<numOfActors;r++){
		if(this.Scene.actors[r].layer == layer){
			//joints
			/*
			var numJoints = this.Scene.actors[r].joints.length;
			for(var jnt=0;jnt<numJoints;jnt++){
				var b= this.Scene.actors[r].joints[jnt].fb2Joint;
				if(this.Scene.actors[r].joints[jnt].pIndex != null){
					var bodyApos = b.GetBodyA().GetPosition();
					var bodyBpos = b.GetBodyB().GetPosition();
					var angle = Math.atan2((bodyBpos.y-bodyApos.y),(bodyBpos.x-bodyApos.x));
					var pos = new b2Vec2((bodyBpos.x+bodyApos.x)/2,(bodyBpos.y+bodyApos.y)/2);
					this.Context.save();
					this.Context.globalAlpha = this.Scene.actors[r].joints[jnt].alpha;	
               		this.Context.translate(pos.x * this.Box2D.scale, pos.y * this.Box2D.scale);
               		this.Context.rotate(angle);
					var AS = this.Scene.spriteSheets[this.Scene.actors[r].joints[jnt].pIndex];
					var point = {x:Math.floor(-(AS.frameWidth/2)+AS.tileRects[this.Scene.actors[r].joints[jnt].frame].offset.x), y:Math.floor(-(AS.frameHeight/2)+AS.tileRects[this.Scene.actors[r].joints[jnt].frame].offset.y)};
					var rect = AS.tileRects[this.Scene.actors[r].joints[jnt].frame].rect;
					this.Context.drawImage(AS.image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
					this.Context.restore();
					this.Context.globalAlpha = 1;	
			};};
			*/
			//bodies
			var numBodies = this.Scene.actors[r].bodies.length;
			for(var c=0;c<numBodies;c++){
				var b = this.Scene.actors[r].bodies[c].fb2Body;
				if(i == this.Scene.actors[r].bodies[c].tileOn.row && j == this.Scene.actors[r].bodies[c].tileOn.col){
					if(this.Scene.actors[r].bodies[c].Sprite != null){
					
						//BODY POSITION AND ROTATION
						var pos = b.GetPosition();        
						this.Context.save();
               			this.Context.translate(Math.floor(pos.x * this.Box2D.scale),Math.floor(pos.y * this.Box2D.scale));
                		this.Context.rotate(b.GetAngle());
                		
                		//BODY SPRITE DECAL DRAW -- back
						var numOfDecals = this.Scene.actors[r].bodies[c].Sprite.decals.length;
						for(var d=0;d<numOfDecals;d++){
							if(this.Scene.actors[r].bodies[c].Sprite.decals[d].front == false){
								rect = this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.decals[d].pIndex].tileRects[this.Scene.actors[r].bodies[c].Sprite.decals[d].frame];	
								point = {x:Math.floor(-(rect.w/2)+this.Scene.actors[r].bodies[c].Sprite.decals[d].x), y:Math.floor(-(rect.h/2)+this.Scene.actors[r].bodies[c].Sprite.decals[d].y)};
								this.Context.globalAlpha = this.Scene.actors[r].bodies[c].Sprite.decals[d].alpha;	
								this.Context.drawImage(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}
						}
                		//BODY SPRITE DRAW
						if(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].animations.length > 0 && this.Scene.actors[r].bodies[c].Sprite.animation != null){
							var animFrameOffset = {x:this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].animations[this.Scene.actors[r].bodies[c].Sprite.animation].offset.x,y:this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].animations[this.Scene.actors[r].bodies[c].Sprite.animation].offset.y};
						}else{
							var animFrameOffset = {x:0,y:0};
						}
						var point = {x:Math.floor(-(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].tileWidth/2)+this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].offset.x+animFrameOffset.x), y:Math.floor(-(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].tileHeight/2)+this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].offset.y+animFrameOffset.y)};
						var rect = this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].tileRects[this.Scene.actors[r].bodies[c].Sprite.frame];	
						this.Context.globalAlpha = this.Scene.actors[r].bodies[c].Sprite.alpha;	
						this.Context.drawImage(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
						
						//BODY SPRITE DECAL DRAW -- front
						var numOfDecals = this.Scene.actors[r].bodies[c].Sprite.decals.length;
						for(var d=0;d<numOfDecals;d++){
							if(this.Scene.actors[r].bodies[c].Sprite.decals[d].front == true){
								rect = this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.decals[d].pIndex].tileRects[this.Scene.actors[r].bodies[c].Sprite.decals[d].frame];	
								point = {x:Math.floor(-(rect.w/2)+this.Scene.actors[r].bodies[c].Sprite.decals[d].x), y:Math.floor(-(rect.h/2)+this.Scene.actors[r].bodies[c].Sprite.decals[d].y)};
								this.Context.globalAlpha = this.Scene.actors[r].bodies[c].Sprite.decals[d].alpha;	
								this.Context.drawImage(this.Scene.spriteSheets[this.Scene.actors[r].bodies[c].Sprite.decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
							}
						}
						this.Context.restore();
						this.Context.globalAlpha = 1;	
		};};};};
	}
}

FLAGENGINE.prototype.drawSprites = function(row,col,layer){
	var numOfSprites = this.Scene.sprites.length;
	for(s=0;s<numOfSprites;s++){
		if(row == this.Scene.sprites[s].tileOn.row && col == this.Scene.sprites[s].tileOn.col){
			if(this.Scene.sprites[s].layer == layer && this.Scene.sprites[s].gui == false && this.Scene.sprites[s].draw == true){
				
				var spritePos = {x:Math.floor(this.Scene.sprites[s].x), y:Math.floor(this.Scene.sprites[s].y)};
				this.Context.save();
				
				//SPRITE DECAL DRAW -- back
				var numOfDecals = this.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(this.Scene.sprites[s].decals[d].front == false){
						var rect = this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].tileRects[this.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[s].decals[d].y)};
						this.Context.globalAlpha = this.Scene.sprites[s].decals[d].alpha;	
						this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
					}
				}
				
				this.Context.globalAlpha = 1;
				
				//SPRITE DRAW
				var rect = this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].tileRects[this.Scene.sprites[s].frame];	
				var point = {x:Math.floor(this.Scene.sprites[s].x-(rect.w/2)+this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.x), y:Math.floor(this.Scene.sprites[s].y-(rect.h/2)+this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.y)};	
				this.Context.globalAlpha = this.Scene.sprites[s].alpha;	
				if(this.Scene.sprites[s].animation != null){
					var animationOffset = {x:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].animations[this.Scene.sprites[s].animation].offset.x), y:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].animations[this.Scene.sprites[s].animation].offset.y)};
					point.x += animationOffset.x;
					point.y += animationOffset.y;
				}
				this.Context.globalAlpha = this.Scene.sprites[s].alpha;
				this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				
				this.Context.globalAlpha = 1;
				
				//SPRITE DECAL DRAW -- front
				var numOfDecals = this.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(this.Scene.sprites[s].decals[d].front == true){
						var rect = this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].tileRects[this.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[s].decals[d].y)};
						this.Context.globalAlpha = this.Scene.sprites[s].decals[d].alpha;	
						this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
					}
				}
				
				this.Context.restore();
				this.Context.globalAlpha = 1;	
			}
		}
	}
}

FLAGENGINE.prototype.drawSprites_GUI = function(){
	var numOfSprites = this.Scene.sprites.length;
	for(i=0;i<numOfSprites;i++){
		if(this.Scene.sprites[i].gui == true){
			
			var spritePos = {x:Math.floor(this.Scene.sprites[i].x-this.Scene.Map.x), y:Math.floor(this.Scene.sprites[i].y-this.Scene.Map.y)};
			this.Context.save();
			
			//SPRITE DECAL DRAW -- back
			var numOfDecals = this.Scene.sprites[i].decals.length;
			for(var d=0;d<numOfDecals;d++){
				if(this.Scene.sprites[i].decals[d].front == false){
					var rect = this.Scene.spriteSheets[this.Scene.sprites[i].decals[d].pIndex].tileRects[this.Scene.sprites[i].decals[d].frame];	
					var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[i].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[i].decals[d].y)};
					this.Context.globalAlpha = this.Scene.sprites[i].decals[d].alpha;	
					this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[i].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				}
			}
			
			this.Context.globalAlpha = 1;
		
			//SPRITE DRAW
			var rect = this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].tileRects[this.Scene.sprites[i].frame];	
			var point = {x:Math.floor(this.Scene.sprites[i].x-(rect.w/2)-this.Scene.Map.x+this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].offset.x), y:Math.floor(this.Scene.sprites[i].y-(rect.h/2)-this.Scene.Map.y+this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].offset.y)};	
			this.Context.globalAlpha = this.Scene.sprites[i].alpha;	
			if(this.Scene.sprites[i].animation != null){
				var animationOffset = {x:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].animations[this.Scene.sprites[i].animation].offset.x), y:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].animations[this.Scene.sprites[i].animation].offset.y)};
				point.x += animationOffset.x;
				point.y += animationOffset.y;
			}
			this.Context.globalAlpha = this.Scene.sprites[i].alpha;
			this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
			
			this.Context.globalAlpha = 1;
			
			//SPRITE DECAL DRAW -- front
			var numOfDecals = this.Scene.sprites[i].decals.length;
			for(var d=0;d<numOfDecals;d++){
				if(this.Scene.sprites[i].decals[d].front == true){
					var rect = this.Scene.spriteSheets[this.Scene.sprites[i].decals[d].pIndex].tileRects[this.Scene.sprites[i].decals[d].frame];	
					var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[i].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[i].decals[d].y)};
					this.Context.globalAlpha = this.Scene.sprites[i].decals[d].alpha;	
					this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[i].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				}
			}
			
			this.Context.restore();
			this.Context.globalAlpha = 1;	
		}
	}
}
//------------------------------------------------------------------
//END DRAW


//GAME LOOP
//------------------------------------------------------------------
FLAGENGINE.prototype.gameLoop = function(){
	if(FLAG.running == true){FLAG.FPS.RAF = requestAnimFrame(FLAG.gameLoop);FLAG.update();};
}
//------------------------------------------------------------------
//END GAME LOOP 


//IMAGE SMOOTHING
//------------------------------------------------------------------
FLAGENGINE.prototype.imageSmoothing = function(smooth){
	//SMOOTH
	if(smooth == true){
		//Browser compatibility - Chrome, Firefox, Opera
		this.Context.imageSmoothingEnabled = true;
		this.Context.mozImageSmoothingEnabled = true;
		this.Context.oImageSmoothingEnabled = true;
		
		//Browser compatibility - Safari, Firefox
		document.getElementById('canvas').style.imageRendering = "auto";
  		document.getElementById('canvas').style.msInterpolationMode = "bicubic";
  		POLE.display.imageSmoothing = true;
  	//PIXELY
	}else if(smooth == false){
		//Browser compatibility - Chrome, Firefox, Opera
		this.Context.imageSmoothingEnabled = false;
		this.Context.mozImageSmoothingEnabled = false;
		this.Context.oImageSmoothingEnabled = false;
		
		//Browser compatibility - Safari, Firefox
		document.getElementById('canvas').style.imageRendering = "-moz-crisp-edges";
   		document.getElementById('canvas').style.imageRendering = "-o-crisp-edges";
   		document.getElementById('canvas').style.imageRendering = "-webkit-optimize-contrast";
  		document.getElementById('canvas').style.imageRendering = "crisp-edges";
  		document.getElementById('canvas').style.msInterpolationMode = "nearest-neighbor";
  		POLE.display.imageSmoothing = false;
	}
}
//------------------------------------------------------------------
//END IMAGE SMOOTHING


//KEY LISTENERS
//------------------------------------------------------------------
FLAGENGINE.prototype.keyDownHandler = function(e){
	if(!e){e = window.event;}
	
   	if (e.keyCode == 38){
	   	this.arrowUp = true;
   	}
   	if (e.keyCode == 40){
	   	this.arrowDown= true;
   	}
   	if (e.keyCode == 37){
	  	this.arrowLeft = true;
   	}
   	if (e.keyCode == 39){
	   	this.arrowRight = true;
   	}
	if(this.Scene != null && this.Scene.keyDown != null){
		this.Scene.keyDown(e);
	}
}

FLAGENGINE.prototype.keyUpHandler = function(e){
   	if(!e){e = window.event;}
   	
   	if (e.keyCode == 38){
		this.arrowUp = false;
	}
   	if (e.keyCode == 40){
		this.arrowDown= false;
   	}
   	if (e.keyCode == 37){
		 this.arrowLeft = false;
   	}
  	if (e.keyCode == 39){
		this.arrowRight = false;
   	}
	if(this.Scene != null && this.Scene.keyUp != null){
		this.Scene.keyUp(e);
	}
}	
//------------------------------------------------------------------
//END KEY LISTENERS


//LOAD SCENE
//------------------------------------------------------------------
FLAGENGINE.prototype.loadScene = function(sceneID,callBack){
	var sceneIndex = -1;
	//if scene is passed as a name
	if(isNaN(sceneID) == true){
		//get number of scene
		var numScenes = POLE.scenes.length;
		for(var i=0;i<numScenes;i++){
			if(POLE.scenes[i].name == sceneID){
				sceneIndex = i;
			}
		}
	//if sceneID is a number
	}else{
		if(sceneID < POLE.scenes.length){
			sceneIndex = sceneID;
		}
	}
	
	if(sceneIndex != -1){
	
		//reset load progress
		this.sceneLoadProgress = 0;
		
		//pause the engine
		this.pause();
		
		//stop the physics world
		this.Box2D.ready = false;
		
		//delete previous Scene
		this.Scene = null;
		delete this.Scene;	
			
		//form new FLAGSCENE Object
		this.Scene = new FLAGSCENE(sceneIndex);
		
		//CALLBACK
		this.Scene.loadCallBack = callBack || function(){};
		
		//LOAD CHECK INTERVAL
		this.Scene.loadInterval = setInterval(function(){FLAG.loadProgress();},10);
		
		//SOUNDS
		//make sure all sounds are loaded
		var numSounds = POLE.sounds.length;
		for(var i=0;i<numSounds;i++){
			this.Sounds.push(new FLAGSOUND(POLE.sounds[i].name,[POLE.sounds[i].ogg,POLE.sounds[i].mp3]));
		}
	}
}
//------------------------------------------------------------------
//END LOAD SCENE


//LOAD PROGRESS
//------------------------------------------------------------------
FLAGENGINE.prototype.loadProgress = function(){

	//Loads are based on how many images there are to load
	//in the future, sounds should be also be factored in on the load
	//also, some sort of filtering to not load images not used in Scene
	//right now all images are loaded
	
	//images
	var numImagesLoaded = 0;
	var numImages = this.Scene.images.length;
	for(var i=0;i<numImages;i++){
		if(this.Scene.images[i].complete){
			numImagesLoaded += 1;
		}			
	}	
	
	//give the percentage
	this.sceneLoadProgress = (numImagesLoaded) * Math.round(100/numImages);
	
	//CHECK IF SCENE IS ALL LOADED
	if(numImagesLoaded == numImages){
		if(POLE.display.imageBuffer == true){
			//draw images to canvases
			for(var i=0;i<numImages;i++){
				this.Scene.images[i].canvas.width = this.Scene.images[i].width;
				this.Scene.images[i].canvas.height = this.Scene.images[i].height;
				this.Scene.images[i].ctx = this.Scene.images[i].canvas.getContext("2d");
				this.Scene.images[i].ctx.drawImage(this.Scene.images[i], 0, 0, this.Scene.images[i].width, this.Scene.images[i].height);
			}	
		}
	
		//load is done
		this.sceneLoadProgress = 100;
		clearInterval(this.Scene.loadInterval);

		//Initialize the physics world
		FLAG.setUpBox2D();
		
		//run tile reduction because size and type may have changed
		FLAG.tileReduction();
		
		//WebGL
		if(this.contextType == 'webgl'){
			this.WebGL.init_Models();
			this.WebGL.init_Lights();
		}
	
		FLAG.play();
		FLAG.Scene.loadCallBack();
	}
}
//------------------------------------------------------------------
//END LOAD PROGRESS


//MOUSE LISTENERS
//------------------------------------------------------------------
FLAGENGINE.prototype.mouseDown = function(e){	
	if(!e){e = window.event;}	
	//normalize event for Firefox and Opera
	if (e.offsetX === undefined){
		e.offsetX = e.layerX;
   		e.offsetY = e.layerY;
	}
	//cancel bubble
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();

	if(this.Scene != null){
		this.Pointer.downLoc.x = e.offsetX - (this.Scene.Map.x*(this.scale)*(this.Scene.scale));
		this.Pointer.downLoc.y = e.offsetY - (this.Scene.Map.y*(this.scale)*(this.Scene.scale));
	}else{
		this.Pointer.downLoc.x = e.offsetX;
		this.Pointer.downLoc.y = e.offsetY;
	}
	this.Pointer.screenLoc.x = e.offsetX;
	this.Pointer.screenLoc.y = e.offsetY;
	if(this.Scene != null){
		this.Pointer.mapLoc.x = ((this.Pointer.screenLoc.x-((this.Scene.Map.x*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
		this.Pointer.mapLoc.y = ((this.Pointer.screenLoc.y-((this.Scene.Map.y*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
	}

	if(this.Scene != null && this.Scene.mouseDown != null){
		this.Scene.mouseDown(e);
	}
}

FLAGENGINE.prototype.mouseMove = function(e){
	if(!e){e = window.event;}
	//normalize event for Firefox and Opera
	if (e.offsetX === undefined){
		e.offsetX = e.layerX;
   		e.offsetY = e.layerY;
	}
	//cancel bubble
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();

    this.Pointer.screenLoc.x = e.offsetX;
	this.Pointer.screenLoc.y = e.offsetY;
	if(this.Scene != null){
		this.Pointer.mapLoc.x = ((this.Pointer.screenLoc.x-((this.Scene.Map.x*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
    	this.Pointer.mapLoc.y = ((this.Pointer.screenLoc.y-((this.Scene.Map.y*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
    }

	if(this.Scene != null && this.Scene.mouseMove != null){
		this.Scene.mouseMove(e);
	}
}

FLAGENGINE.prototype.mouseOut =  function(e){
	if(!e){e = window.event;}		
	//normalize event for Firefox and Opera
	if (e.offsetX === undefined){
		e.offsetX = e.layerX;
   		e.offsetY = e.layerY;
	}
	//cancel bubble
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();

	if(this.Scene != null && this.Scene.mouseOut != null){
		this.Scene.mouseOut(e);
	}
}

FLAGENGINE.prototype.mouseUp = function(e){
	if(!e){e = window.event;}
	//normalize event for Firefox and Opera
	if (e.offsetX === undefined){
		e.offsetX = e.layerX;
   		e.offsetY = e.layerY;
	}
	//cancel bubble
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();

	if(this.Scene != null && this.Scene.mouseUp != null){
		this.Scene.mouseUp(e);
	}
}

FLAGENGINE.prototype.mouseWheel = function(e){
	if(!e){e = window.event;}
	//normalize event for Firefox and Opera
	if (e.offsetX === undefined){
		e.offsetX = e.layerX;
   		e.offsetY = e.layerY;
	}
	//cancel bubble
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();

	if(this.Scene != null && this.Scene.mouseWheel != null){
		this.Scene.mouseWheel(e);
	}
}
//------------------------------------------------------------------
//END MOUSE LISTENERS


//PAUSE and PLAY
//------------------------------------------------------------------
FLAGENGINE.prototype.pause = function(){

	//check for requestAnimFrame
	window.requestAnimFrame = (function(){
  		return  	window.requestAnimationFrame       	||
          			window.webkitRequestAnimationFrame 	||
          			window.mozRequestAnimationFrame    	||
          			window.oRequestAnimationFrame      	||
          			window.msRequestAnimationFrame    	
	})();
	window.cancelRequestAnimFrame = ( function() {
    	return 	window.cancelAnimationFrame         				||
        			window.webkitCancelRequestAnimationFrame    	||
        			window.mozCancelRequestAnimationFrame       	||
        			window.oCancelRequestAnimationFrame     		||
        			window.msCancelRequestAnimationFrame        	||
        clearTimeout
	} )();
	

	//if requestAnimFrame doesnt exist
	if(!window.requestAnimFrame){
			clearInterval(FLAG.update_Interval); 
			clearInterval(FLAG.spriteFrames_Interval); 
	}else{   
		if(FLAG.FPS.useRAF == true){
			window.cancelRequestAnimFrame(FLAG.FPS.RAF);
			clearInterval(FLAG.spriteFrames_Interval); 
		}else{
			clearInterval(FLAG.update_Interval); 
			clearInterval(FLAG.spriteFrames_Interval); 
		}
	}
	FLAG.running = false;
}


FLAGENGINE.prototype.play = function(){

	//check for requestAnimFrame
	window.requestAnimFrame = (function(){
  		return  	window.requestAnimationFrame       	||
          			window.webkitRequestAnimationFrame 	||
          			window.mozRequestAnimationFrame    	||
          			window.oRequestAnimationFrame      	||
          			window.msRequestAnimationFrame    	
	})();
	window.cancelRequestAnimFrame = ( function() {
    	return 	window.cancelAnimationFrame         				||
        			window.webkitCancelRequestAnimationFrame    	||
        			window.mozCancelRequestAnimationFrame       	||
        			window.oCancelRequestAnimationFrame     		||
        			window.msCancelRequestAnimationFrame        	||
        clearTimeout
	} )();
	
	
	
	if(FLAG.running == false){
		FLAG.running = true;	 

		//if requestAnimFrame doesnt exist
		if(!window.requestAnimFrame){
			//set frame rate
			FLAG.update_Interval = setInterval(function(){FLAG.update();}, 1000 / FLAG.FPS.set);	
		//if requestAnimFrame does exist
		}else{  
			//if use requestAnimFrame is set to true
			if(FLAG.FPS.useRAF == true){
				//adjustable frame rate
				FLAG.gameLoop();
			//if use requestAnimFrame is set to false
			}else{
				//set frame rate
				FLAG.update_Interval = setInterval(function(){FLAG.update();}, 1000 / FLAG.FPS.set);	
			}
		}
	   
		//cycle any sprite sequences
		FLAG.spriteFrames_Interval = setInterval(function(){FLAG.cycleSpriteFrames();}, 1000 / FLAG.FPS.sprites);
	}
}
//------------------------------------------------------------------
//END PAUSE and PLAY 


//POINTS IN SHAPES
//------------------------------------------------------------------

FLAGENGINE.prototype.pointDistance = function(pointA,pointB){
	var distance = Math.sqrt(Math.pow(pointB.x-pointA.x,2)+Math.pow(pointB.y-pointA.y,2));
	return distance;
}

FLAGENGINE.prototype.pointInCircle = function(point,center,radius){
	var inside = false;
	if(Math.sqrt((point.x-center.x)*(point.x-center.x) + (point.y-center.y)*(point.y-center.y)) < radius){
		inside = true;
	}
	return inside;
}

FLAGENGINE.prototype.pointInPoly = function(point,polygonPointArray){
    var x = point.x;
    var y = point.y;    
    
    var inside = false;
    for (var i = 0, j = polygonPointArray.length - 1; i < polygonPointArray.length; j = i++) {
        var xi = polygonPointArray[i].x, yi = polygonPointArray[i].y;
        var xj = polygonPointArray[j].x, yj = polygonPointArray[j].y;
        
        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
};

FLAGENGINE.prototype.pointInRect = function(point,rect){
	var isInside = false;
	if(point.x > rect.x && point.x < rect.x + rect.w){
		if(point.y > rect.y && point.y < rect.y + rect.h){
			isInside = true;
	}}
	return isInside;
}

FLAGENGINE.prototype.pointToHexTile = function(point,suspectedTile){
	var possibleTiles = [
					{col:suspectedTile.col,row:suspectedTile.row},
					{col:suspectedTile.col,row:suspectedTile.row-1},
					{col:suspectedTile.col-1,row:suspectedTile.row},
					{col:suspectedTile.col-1,row:suspectedTile.row+1},
					{col:suspectedTile.col,row:suspectedTile.row+1},
					{col:suspectedTile.col+1,row:suspectedTile.row+1},
					{col:suspectedTile.col+1,row:suspectedTile.row}
						];
	var tile = {col:possibleTiles[0].col,row:possibleTiles[0].row};
	
	var tileWs = this.Scene.Map.tileWidth;
	var tileHs = this.Scene.Map.tileHeight;
			
	//make polygons for the possible tiles
	for(var p=0;p<7;p++){
		var hexX = (possibleTiles[p].col * (tileWs * .5) * 1.5);
		var hexY = (possibleTiles[p].row * tileHs + (possibleTiles[p].col % 2) * tileHs / 2);			
		var startPoint = {x:(hexX),y:(hexY)};
		var polygonPointArray = [	
						{x:startPoint.x+(tileWs/4),y:startPoint.y},
						{x:startPoint.x+tileWs-(tileWs/4),y:startPoint.y},
						{x:startPoint.x+tileWs,y:startPoint.y+(tileHs/2)},
						{x:startPoint.x+tileWs-(tileWs/4),y:startPoint.y+tileHs},
						{x:startPoint.x+(tileWs/4),y:startPoint.y+tileHs},
						{x:startPoint.x,y:startPoint.y+(tileHs/2)}
						];
				
		if(this.pointInPoly(point,polygonPointArray) == true){
			tile.col = possibleTiles[p].col;
			tile.row = possibleTiles[p].row;
		}
	}
	
	return tile;
}

FLAGENGINE.prototype.pointToIsoTile = function(point,suspectedTile){
	var possibleTiles = [
					{col:suspectedTile.col,row:suspectedTile.row},
					{col:suspectedTile.col,row:suspectedTile.row-1},
					{col:suspectedTile.col-1,row:suspectedTile.row},
					{col:suspectedTile.col,row:suspectedTile.row+1},
					{col:suspectedTile.col,row:suspectedTile.row+2},
					{col:suspectedTile.col+1,row:suspectedTile.row+1},
					{col:suspectedTile.col+1,row:suspectedTile.row},
					{col:suspectedTile.col+1,row:suspectedTile.row-1},
					{col:suspectedTile.col,row:suspectedTile.row-2}
						];
	var tile = {col:possibleTiles[0].col,row:possibleTiles[0].row};
	
	var tileWs = this.Scene.Map.tileWidth;
	var tileHs = this.Scene.Map.tileHeight;
			
	//make polygons for the possible tiles
	for(var p=0;p<9;p++){
		var isoX = ((tileWs*.5)*possibleTiles[p].col)-((tileWs*.5)*possibleTiles[p].row);
		var isoY = ((tileWs*.25)*possibleTiles[p].row)+((tileWs*.25)*possibleTiles[p].col);									
		var startPoint = {x:(isoX),y:(isoY)};
		var polygonPointArray = [	
						{x:startPoint.x,y:startPoint.y},
						{x:startPoint.x+(tileWs/2),y:startPoint.y+(tileHs/2)},
						{x:startPoint.x,y:startPoint.y+(this.Scene.Map.tileHeight)},
						{x:startPoint.x-(tileWs/2),y:startPoint.y+(tileHs/2)}
						];
				
		if(this.pointInPoly(point,polygonPointArray) == true){
			tile.col = possibleTiles[p].col;
			tile.row = possibleTiles[p].row;
		}
	}
	
	return tile;
}
//------------------------------------------------------------------
//END POINTS IN SHAPES


//REMOVE ACTOR
//Removes an actor from the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.removeActor = function(instanceName){
	//destroy all bodies of the actor
	FLAG.Actor(instanceName).destroy();
}
//------------------------------------------------------------------
//END REMOVE ACTOR


//REMOVE SPRITE
//Remove a sprite from the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.removeSprite = function(instanceName){
	var numSprites = this.Scene.sprites.length;
	var keepSprites = [];
	for(var d=0;d<numSprites;d++){
		if(this.Scene.sprites[d].name != instanceName){
			keepSprites.push(this.Scene.sprites[d]);
		}
	}
	this.Scene.sprites = [];
	this.Scene.sprites = keepSprites;
	keepSprites = [];
}
//------------------------------------------------------------------
//END REMOVE SPRITE


//REMOVE TILED OBJECT
//Removes a tiled object from scene
//------------------------------------------------------------------
FLAGENGINE.prototype.removeTiledObject = function(index){
	var numTiledObjects = this.Scene.tiledObjects.length;
	for(var i=0;i<numTiledObjects;i++){
		if(i == index){
			//remove old tiled object from arrays
			var numRows = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[i].pIndex].rows;
			var numCols = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[i].pIndex].cols;
			var row = this.Scene.tiledObjects[i].row;
			var col = this.Scene.tiledObjects[i].col;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					this.Scene.layers[this.Scene.tiledObjects[i].layer].tileIDs[row+r][col+c] = 0;
					this.Scene.layers[this.Scene.tiledObjects[i].layer].tiledObjectIDs[row+r][col+c] = 0;
				}
			}
		}
	}
	
	var tiledObjectsToKeep = [];
	for(var to=0;to<numTiledObjects;to++){
		if(to != index){
			tiledObjectsToKeep.push(this.Scene.tiledObjects[to]);
		}
	}	
	this.Scene.tiledObjects = tiledObjectsToKeep;
	tiledObjectsToKeep = [];
	
	//change all the indexes on the tiledObjectIDs that were above the one removed to one less
	var numTiledObjects = this.Scene.tiledObjects.length;
	for(var i=0;i<numTiledObjects;i++){
		var numRows = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[i].pIndex].rows;
		var numCols = this.Scene.tiledObjectSheets[this.Scene.tiledObjects[i].pIndex].cols;
		var row = this.Scene.tiledObjects[i].row;
		var col = this.Scene.tiledObjects[i].col;
		for(var r=0;r<numRows;r++){
			for(var c=0;c<numCols;c++){
				if(this.Scene.layers[this.Scene.tiledObjects[i].layer].tiledObjectIDs[row+r][col+c] > index){
					this.Scene.layers[this.Scene.tiledObjects[i].layer].tiledObjectIDs[row+r][col+c] -= 1;
				}
			}
		}
	}
}
//------------------------------------------------------------------
//END REMOVE TILED OBJECT


//REMOVE TILE SPRITE
//Removes a tiled sprite from scene
//------------------------------------------------------------------
FLAGENGINE.prototype.removeTileSprite = function(instanceName){
	var numTileSprites = this.Scene.tileSprites.length;
	var tileSpritesToKeep = [];
	for(var tp=0;tp<numTileSprites;tp++){
		if(this.Scene.tileSprites[tp].name != instanceName){
			tileSpritesToKeep.push(this.Scene.tileSprites[tp]);
		}
	}
	this.Scene.tileSprites = [];
	this.Scene.tileSprites = tileSpritesToKeep;
}
//------------------------------------------------------------------
//END REMOVE TILE SPRITE


//SCALE GAME
//------------------------------------------------------------------
FLAGENGINE.prototype.scaleGame = function(){
	if(this.Scene != null){
		switch(POLE.display.fit){
		
			case "static":			
				//SCALE
				//use 1 for scale
				this.scale = 1;
		
				//BODY
				//resize body
				document.body.style.width = POLE.display.w + "px";
		
				//GAME
				//resize the game
				this.Game.style.width = POLE.display.w + "px";
				this.Game.style.height = POLE.display.h + "px";
		
				//CANVAS
				//resize the canvas to the display size
				this.Context.canvas.width = POLE.display.w;
				this.Context.canvas.height = POLE.display.h;
				this.Canvas.width = POLE.display.w;
				this.Canvas.height = POLE.display.h;
				this.center.x = POLE.display.w/2;
				this.center.y = POLE.display.h/2;
				this.Canvas.style.width = POLE.display.w+"px";
				this.Canvas.style.height = POLE.display.h+"px";
		
				//GUI
				//resize the gui
				if(this.GUI != null){
					this.GUI.style.width = POLE.display.w + "px";
					this.GUI.style.height = POLE.display.h + "px";
				}
		
				//GLASS
				//rezie the glass
				if(this.Glass != null){
					this.Glass.style.width = POLE.display.w + "px";
					this.Glass.style.height = POLE.display.h + "px";
				}
				break;	
		
			case "window":
			
				if(POLE.display.scale == "none"){
					//SCALE
					//use 1 for scale
					this.scale = 1;
		
					//BODY
					//resize body to width of window
					document.body.style.width = "100%";
		
					//GAME
					//resize the game
					this.Game.style.width = window.innerWidth + "px";
					this.Game.style.height = window.innerHeight + "px";
		
					//CANVAS
					//resize the canvas
					switch(this.contextType){
						case '2d':
							this.Context.canvas.width = window.innerWidth;
							this.Context.canvas.height = window.innerHeight;
							break;
						case 'webgl':
							this.Context.viewport(0, 0, window.innerWidth, window.innerHeight);
							break;
					}					
					this.Canvas.width = window.innerWidth;
					this.Canvas.height = window.innerHeight;
					this.center.x = window.innerWidth/2;
					this.center.y = window.innerHeight/2;
					this.Canvas.style.width = "100%";
					this.Canvas.style.height = (window.innerHeight*(this.scale))+"px";
		
					//GUI
					//resize the gui
					if(this.GUI != null){
						this.GUI.style.width = window.innerWidth + "px";
						this.GUI.style.height = window.innerHeight + "px";
					}
		
					//GLASS
					//rezie the glass
					if(this.Glass != null){
						this.Glass.style.width = window.innerWidth + "px";
						this.Glass.style.height = window.innerHeight + "px";
					}
					
				}else{
				
					//SCALE
					//use width for scale
					this.scale = ((window.innerWidth*100)/POLE.display.w)/100;

					//BODY
					//set the body width
					document.body.style.width = "100%";

					//FONTS
					//scales fonts
					document.body.style.fontSize = (this.scale*100)+"px";

					//GAME
					//resize the game
					this.Game.style.width = "100%";
					this.Game.style.height = (POLE.display.h*(this.scale))+"px";
					if(POLE.display.scale == "adapt"){
						this.Game.style.height = (window.innerHeight)+"px";
					}

					//CANVAS
					//resize the canvas
					switch(this.contextType){
						case '2d':
							this.Context.canvas.width = POLE.display.w;
							this.Context.canvas.height = POLE.display.h;
							if(POLE.display.scale == "adapt"){
								this.Context.canvas.height = window.innerHeight/this.scale;
							}
							break;
						case 'webgl':
							this.Context.viewport(0, 0, POLE.display.w, POLE.display.h);
							if(POLE.display.scale == "adapt"){
								var height = window.innerHeight/this.scale;
								this.Context.viewport(0, 0, POLE.display.w, height);
							}
							break;
					}
					
					this.Canvas.width = POLE.display.w;
					this.Canvas.height = POLE.display.h;
					if(POLE.display.scale == "adapt"){
						this.Canvas.height = window.innerHeight/this.scale;
					}
					this.center.x = POLE.display.w/2;
					this.center.y = POLE.display.h/2;
					if(POLE.display.scale == "adapt"){
						this.center.y = (window.innerHeight/this.scale)/2;
					}
					this.Canvas.style.width = "100%";
					this.Canvas.style.height = (POLE.display.h*(this.scale))+"px";	
					if(POLE.display.scale == "adapt"){
						this.Canvas.style.height = (window.innerHeight)+"px";
					}		

					//GUI
					//resize the gui
					if(this.GUI != null){
						this.GUI.style.width = "100%";
						this.GUI.style.height = "inherit";
					}

					//GLASS
					//rezie the glass
					if(this.Glass != null){
						this.Glass.style.width = "100%";
						this.Glass.style.height = "inherit";
					}

					//POST SCALE
					//once everything has been set, set the scale
					this.scale = ((this.Canvas.clientWidth*100)/POLE.display.w)/100;	

					//if the height is too big at that scale, and fit is set to both
					if(POLE.display.scale == "both"){
						if(POLE.display.h*(this.scale) > window.innerHeight){
	
							//SCALE
							//use the height for scale
							this.scale = ((window.innerHeight*100)/POLE.display.h)/100;
		
							//BODY
							//set the body width
							document.body.style.width = POLE.display.w*(this.scale)+"px";
		
							//FONTS
							//scales fonts
							document.body.style.fontSize = (this.scale*100)+"px";					
		
							//GAME
							//scale game height to match canvas
							this.Game.style.height = (POLE.display.h*(this.scale))+"px";
							this.Canvas.style.height = (POLE.display.h*(this.scale))+"px";
		
							//POST SCALE
							//once everything has been set, set the scale
							this.scale = ((this.Canvas.clientHeight*100)/POLE.display.h)/100;
						}
					}
				}
				break;
		}

		//image smoothing
		this.imageSmoothing(POLE.display.imageSmoothing);

		//CUSTOM SCENE RESIZE
		if(this.Scene.resize != null){
			this.Scene.resize();	
		}
		
		//TILE REDUCTION
		//tiles that need to be draw might have change on resize
		this.tileReduction();
		
		//WEBGL CAMERA
		if(this.contextType == 'webgl'){
			this.WebGL.camera.set_projection(this.Canvas, this.WebGL.view_mtrx, this.WebGL.projection_mtrx);
		}
	}
}
//------------------------------------------------------------------
//END SCALE GAME


//SET CONTEXT 
//Defines the context of the canvas, either 2d or webgl
//------------------------------------------------------------------
FLAGENGINE.prototype.setContext = function(setAs){

	var context = null;
	
	if(setAs != '2d'){
	
		//Try webgl
	
		try {
			// Try to grab the standard context. If it fails, fallback to experimental.
			context = this.Canvas.getContext("webgl") || this.Canvas.getContext("experimental-webgl");
			this.contextType = "webgl";
		  }
		catch(e) {}

		// If we don't have a webgl context, use standard 2d context
		if (!context) {
		
			context = this.Canvas.getContext('2d');
			this.contextType = "2d";
	
		//if there is a webgl context
		}else{

			context.clearColor(0.0, 0.0, 0.0, 1.0);									// Set clear color to black, fully opaque
			context.enable(context.DEPTH_TEST);										// Enable depth testing
			context.depthFunc(context.LEQUAL);										// Near things obscure far things
			context.clear(context.COLOR_BUFFER_BIT|context.DEPTH_BUFFER_BIT);		// Clear the color as well as the depth buffer.
		}
	
	}else{
	
		//use 2d context
	
		context = this.Canvas.getContext('2d');
		this.contextType = "2d";
	
	}
	
	return context;
}
//------------------------------------------------------------------
//END SET CONTEXT 


//SETUP BOX 2D 
//Initializes and creates the physics world
//------------------------------------------------------------------
FLAGENGINE.prototype.setUpBox2D = function(){
	
	//set the world scale equal to the scene's tile width
	this.Box2D.scale = this.Scene.Map.tileWidth;
	this.Box2D.world = new b2World(this.Scene.gravity, true);
	
	if(this.Scene.useWTC == true){
		 
		var fixDef = new b2FixtureDef;
		fixDef.density = 1.0;
		fixDef.friction = 1.0;
		fixDef.restitution = 0.0;
		fixDef.filter.groupIndex = 0;
         
		var bodyDef = new b2BodyDef;
		bodyDef.type = b2Body.b2_staticBody;
		var userData = {name:"tiles"};
		bodyDef.userData = userData;
		fixDef.shape = new b2PolygonShape;
		
		//Grouped Bodies
		if(this.Scene.Map.type == "orthogonal" || this.Scene.Map.type == "isometric"){
			var boxes = [];
			var start = false;
			var startVec;
			var endVec;
			for(var i=0;i<this.Scene.Map.tilesHigh;i++){
				startVec = null;	
				endVec = null;	
				start=false;
				for(var j=0;j<this.Scene.Map.tilesWide;j++){		
					//first column
					if(j==0){
						if(this.Scene.walkableTiles[i][j] == 0){
							startVec = new b2Vec2(j,i);
							endVec = new b2Vec2(j,(i+1));
							start = true;
						}else if(this.Scene.walkableTiles[i][j] == 1){
							start = false;
						}else if(this.Scene.walkableTiles[i][j] == 2){
							startVec = new b2Vec2((j+1),i);
							endVec = new b2Vec2(j,(i+1));
							start = true;
						}else if(this.Scene.walkableTiles[i][j] == 3){
							startVec = new b2Vec2(j,i);
							endVec = new b2Vec2(j,(i+1));
							boxes.push({shape:[startVec, new b2Vec2((j+1),(i+1)), endVec]});
							start = false;
						}else if(this.Scene.walkableTiles[i][j] == 4){
							startVec = new b2Vec2(j,i);
							endVec = new b2Vec2(j,(i+1));
							boxes.push({shape:[startVec, new b2Vec2((j+1),i), endVec]});
							start = false;
						}else if(this.Scene.walkableTiles[i][j] == 5){
							startVec = new b2Vec2(j,i);
							endVec = new b2Vec2((j+1),(i+1));
							start = true;
						}
					//middle columns
					}else if(j>0 && j != this.Scene.Map.tilesWide -1){
						if(this.Scene.walkableTiles[i][j] == 0){
							if(start == true){
							
							}else{
								startVec = new b2Vec2(j,i);
								endVec = new b2Vec2(j,(i+1));
								start = true;
							}
						}else if(this.Scene.walkableTiles[i][j] == 1){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2(j,(i+1)), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
									start = false;
								}
							}
						}else if(this.Scene.walkableTiles[i][j] == 2){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2(j,(i+1)), endVec]});
									startVec = new b2Vec2((j+1),i);
									endVec = new b2Vec2(j,(i+1));
									start = true;
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), endVec]});
									startVec = new b2Vec2((j+1),i);
									endVec = new b2Vec2(j,(i+1));
									start = true;
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
									startVec = new b2Vec2((j+1),i);
									endVec = new b2Vec2(j,(i+1));
									start = true;
								}
							}else{
								startVec = new b2Vec2((j+1),i);
								endVec = new b2Vec2(j,(i+1));
								start = true;
							}
						}else if(this.Scene.walkableTiles[i][j] == 3){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2((j+1),(i+1)), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), endVec]});
									start = false;
								}
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
								start = false;
							}
						}else if(this.Scene.walkableTiles[i][j] == 4){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2((j+1),i), new b2Vec2(j,(i+1)), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),i), endVec]});
									start = false;
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2((j+1),i), new b2Vec2(j,(i+1)), endVec]});
									start = false;
								}
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2((j+1),i), new b2Vec2(j,(i+1))]});
								start = false;
							}
						}else if(this.Scene.walkableTiles[i][j] == 5){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2(j,(i+1)), endVec]});
									startVec = new b2Vec2(j,i);
									endVec = new b2Vec2((j+1),(i+1));
									start = true;
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), endVec]});
									startVec = new b2Vec2(j,i);
									endVec = new b2Vec2((j+1),(i+1));
									start = true;								
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
									startVec = new b2Vec2(j,i);
									endVec = new b2Vec2((j+1),(i+1));
									start = true;									
								}
							}else{
								startVec = new b2Vec2(j,i);
								endVec = new b2Vec2((j+1),(i+1));
								start = true;
							}
						}
					//end column
					}else if(j == this.Scene.Map.tilesWide -1){
						if(this.Scene.walkableTiles[i][j] == 0){
							if(start == true){
								boxes.push({shape:[startVec, new b2Vec2((j+1),i), new b2Vec2((j+1),(i+1)), endVec]});
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2((j+1),i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
							}
						}else if(this.Scene.walkableTiles[i][j] == 1){
							if(start == true){
								boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
							}
						}else if(this.Scene.walkableTiles[i][j] == 2){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2(j,(i+1)), endVec]});
									boxes.push({shape:[new b2Vec2((j+1),i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), endVec]});
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
									boxes.push({shape:[new b2Vec2((j+1),i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
								}
							}else{
								boxes.push({shape:[new b2Vec2((j+1),i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
							}
						}else if(this.Scene.walkableTiles[i][j] == 3){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2((j+1),(i+1)), endVec]});
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), endVec]});
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), endVec]});
								}
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2((j+1),(i+1)), new b2Vec2(j,(i+1))]});
							}
						}else if(this.Scene.walkableTiles[i][j] == 4){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2((j+1),i), new b2Vec2(j,(i+1)), endVec]});
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2((j+1),i), endVec]});
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2((j+1),i), new b2Vec2(j,(i+1)), endVec]});
								}
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2((j+1),i), new b2Vec2(j,(i+1))]});
							}
						}else if(this.Scene.walkableTiles[i][j] == 5){
							if(start == true){
								if(this.Scene.walkableTiles[i][j-1] == 2){
									boxes.push({shape:[startVec, new b2Vec2(j,(i+1)), endVec]});
									boxes.push({shape:[new b2Vec2(j,i), new b2Vec2(j,(i+1)), new b2Vec2((j+1),(i+1))]});
								}else if(this.Scene.walkableTiles[i][j-1] == 5){
									boxes.push({shape:[startVec, new b2Vec2(j,i), endVec]});
									boxes.push({shape:[new b2Vec2(j,i), new b2Vec2(j,(i+1)), new b2Vec2((j+1),(i+1))]});
								}else if(this.Scene.walkableTiles[i][j-1] == 0){
									boxes.push({shape:[startVec, new b2Vec2(j,i), new b2Vec2(j,(i+1)), endVec]});
									boxes.push({shape:[new b2Vec2(j,i), new b2Vec2(j,(i+1)), new b2Vec2((j+1),(i+1))]});
								}
							}else{
								boxes.push({shape:[new b2Vec2(j,i), new b2Vec2(j,(i+1)), new b2Vec2((j+1),(i+1))]});
							}
						}
					}
				}			
			}
		
			var numBoxes=boxes.length;
			for(var b=0;b<numBoxes;b++){
				if(this.Scene.Map.type == "orthogonal"){					
					var numPoints = boxes[b].shape.length;
					var points = [];
					for(var p=0;p<numPoints;p++){
						var x = boxes[b].shape[p].x*this.Box2D.scale;
						var y = boxes[b].shape[p].y*this.Box2D.scale;
						points.push(new b2Vec2(x,y));
					}
					this.Scene.worldColliders.push({name:"walkableTileCollider_"+b,points:points,fixDef:{density:1,friction:1,restitution:0,filter:{groupIndex:0}},editable:false});
					
				}else if(this.Scene.Map.type == "isometric"){
					var numPoints = boxes[b].shape.length;
					var points = [];
					for(var p=0;p<numPoints;p++){
						var x = boxes[b].shape[p].x;
						var y = boxes[b].shape[p].y;
						var isoX  = this.Scene.Map.gridPoints[boxes[b].shape[p].y][boxes[b].shape[p].x].x;
						var isoY  = this.Scene.Map.gridPoints[boxes[b].shape[p].y][boxes[b].shape[p].x].y;
						points.push(new b2Vec2(isoX,isoY));
					}
					this.Scene.worldColliders.push({name:"walkableTileCollider_"+b,points:points,fixDef:{density:1,friction:1,restitution:0,filter:{groupIndex:0}},editable:false});
				}			
			}	
			
		}else if(this.Scene.Map.type == "hexagonal"){
			var b=0;
			for(var i=0;i<this.Scene.Map.tilesHigh;i++){
				for(var j=0;j<this.Scene.Map.tilesWide;j++){
					if(this.Scene.walkableTiles[i][j] == 0){
						var points = [];
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x+(this.Scene.Map.tileWidth/4)),(this.Scene.Map.gridPoints[i][j].y)));
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(this.Scene.Map.gridPoints[i][j].y)));
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x+this.Scene.Map.tileWidth),(this.Scene.Map.gridPoints[i][j].y+(this.Scene.Map.tileHeight/2))));
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x+this.Scene.Map.tileWidth-(this.Scene.Map.tileWidth/4)),(this.Scene.Map.gridPoints[i][j].y+(this.Scene.Map.tileHeight))));
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x+(this.Scene.Map.tileWidth/4)),(this.Scene.Map.gridPoints[i][j].y+(this.Scene.Map.tileHeight))));
						points.push(new b2Vec2((this.Scene.Map.gridPoints[i][j].x),(this.Scene.Map.gridPoints[i][j].y+(this.Scene.Map.tileHeight/2))));
						this.Scene.worldColliders.push({name:"walkableTileCollider_"+b,points:points,fixDef:{density:1,friction:1,restitution:0,filter:{groupIndex:0}},editable:false});
						b+=1;
					}
				}
			}
		}
	}
	
	//Create worldColliders
	var numPolygons = this.Scene.worldColliders.length;
	var worldShapes = [];
	for(var s=0;s<numPolygons;s++){
		var pointsArray = [];
		var numPoints = this.Scene.worldColliders[s].points.length;
		for(var p=0;p<numPoints;p++){
			pointsArray.push(new b2Vec2(this.Scene.worldColliders[s].points[p].x/this.Box2D.scale,this.Scene.worldColliders[s].points[p].y/this.Box2D.scale));
		}	
		worldShapes.push(pointsArray);
	}		
		
	for(var b=0;b<numPolygons;b++){
		var fixDef = new b2FixtureDef;
		fixDef.density = this.Scene.worldColliders[b].fixDef.density;	
		fixDef.friction = this.Scene.worldColliders[b].fixDef.friction;	
		fixDef.restitution = this.Scene.worldColliders[b].fixDef.restitution;
		fixDef.filter.groupIndex = this.Scene.worldColliders[b].fixDef.filter.groupIndex;
         
		var bodyDef = new b2BodyDef;
		bodyDef.type = b2Body.b2_staticBody;
		var userData = {};
		bodyDef.userData = userData;
		fixDef.shape = new b2PolygonShape;

		fixDef.shape.SetAsArray(worldShapes[b]);
		bodyDef.position.Set(0,0);					
		bodyDef.userData.name = this.Scene.worldColliders[b].name || "worldCollider_"+b;				

		//Separator Validator
		//checks if points are arrange in a clockwise order
		//if(Box2DSeparator.validate(worldShapes[b])==0){console.log("Good");}else{console.log("No Good");}
		
		//adds the body to the world
		var body = this.Box2D.world.CreateBody(bodyDef);
		//separates the body into convex shapes
		Box2DSeparator.separate(body, fixDef, worldShapes[b], this.Box2D.scale);
		
		//old way of adding body to the world
		//this.Box2D.world.CreateBody(bodyDef).CreateFixture(fixDef);
	}
	
	var numOfActors = this.Scene.actors.length;
	for(var i=0;i<numOfActors;i++){
		this.addActorToWorld(i);
	}
		
	//setup debug draw
    var debugDraw = new b2DebugDraw();
	debugDraw.SetSprite(this.Context);
	debugDraw.SetDrawScale(this.Box2D.scale);
	debugDraw.SetFillAlpha(0.5);
	debugDraw.SetLineThickness(1.0);
	debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
	this.Box2D.world.SetDebugDraw(debugDraw);
	
	//contact listener	
	this.ContactListener = new Box2D.Dynamics.b2ContactListener;
   	this.Box2D.world.SetContactListener(this.ContactListener);	
   	
   	//set the physics world to ready
   	this.Box2D.ready = true;	
}
//------------------------------------------------------------------
//END SETUP BOX 2D


//SOUND
//returns a FLAGSOUND object
//------------------------------------------------------------------
FLAGENGINE.prototype.Sound = function(name){
	var numSounds = this.Sounds.length;
	for(var s=0;s<numSounds;s++){
		if(this.Sounds[s].name == name){
			return this.Sounds[s];
		}
	}
}
//------------------------------------------------------------------
//END SOUND


//SPRITE
//Returns a sprite in the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.Sprite = function(instanceName){
	var numSprites = this.Scene.sprites.length;
	for(var d=0;d<numSprites;d++){
		if(this.Scene.sprites[d].name == instanceName){
			return this.Scene.sprites[d];
		}
	}
}
//------------------------------------------------------------------
//END SPRITE


//SPRITES CLICK
//Returns a list of sprites under pointer click
//------------------------------------------------------------------
FLAGENGINE.prototype.spritesClicked = function(){
	//an array to hold the names of the sprites clicked
	var spritesClicked = [];
	//get the mouse position
	var clickPoint = {x:this.Pointer.mapLoc.x, y:this.Pointer.mapLoc.y};
	//check the scene for sprites
	var numSprites = this.Scene.sprites.length;
	for(var i=0;i<numSprites;i++){
		//get the position of the decal
		var spriteRect = this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].tileRects[this.Scene.sprites[i].frame];
		var offset = {x:this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].offset.x,y:this.Scene.spriteSheets[this.Scene.sprites[i].pIndex].offset.y};
		if(this.Scene.sprites[i].gui == false){
			var spritePoint = {x:this.Scene.sprites[i].x+offset.x, y:this.Scene.sprites[i].y+offset.y};
		}else if(this.Scene.sprites[i].gui == true){
			var spritePoint = {x:this.Scene.sprites[i].x+offset.x-this.Scene.Map.x, y:this.Scene.sprites[i].y+offset.y-this.Scene.Map.y};
		}
		
		//set up the rect to check
		var checkRect = {x:0,y:0,w:0,h:0};
		checkRect.x = spritePoint.x - ((spriteRect.w/2)*this.scale);
		checkRect.y = spritePoint.y - ((spriteRect.h/2)*this.scale);
		checkRect.w = spriteRect.w*this.scale;
		checkRect.h = spriteRect.h*this.scale;		
		
		if(this.pointInRect(clickPoint,checkRect) == true){
			spritesClicked.push({name:this.Scene.sprites[i].name,sIndex:i});
		}
	}
	return spritesClicked;
}
//------------------------------------------------------------------
//END SPRITES CLICK


//TILED OBJECT
//Returns a tiled object in the scene
//------------------------------------------------------------------
FLAGENGINE.prototype.TiledObject = function(instanceName){
	var numTiledObjects = this.Scene.tiledObjects.length;
	for(var to=0;to<numTiledObjects;to++){
		if(this.Scene.tiledObjects[to].name == instanceName){
			return this.Scene.tiledObjects[to];
		}
	}
}
//------------------------------------------------------------------
//END TILED OBJECT


//TILED OBJECT PREVIEW
//draws a preview and tiles of object trying to be placed returns true if it can be placed
//------------------------------------------------------------------
FLAGENGINE.prototype.tiledObjectPreview = function(tiledObjectName,p){
	var okToDrawTiledObject = true;
	//is the mouse on the Map
	if(this.Pointer.tileOn.row >= 0 && this.Pointer.tileOn.row < this.Scene.Map.tilesHigh && this.Pointer.tileOn.col >= 0 && this.Pointer.tileOn.col < this.Scene.Map.tilesWide){
		//search for the name of the tiled object
		var numTiledObjects = this.Scene.tiledObjectSheets.length;
		var tiledObjectIndex = -1;
		for(var to=0;to<numTiledObjects;to++){
			if(this.Scene.tiledObjectSheets[to].name == tiledObjectName){
				tiledObjectIndex = to;
			}
		}
		
		if(tiledObjectIndex != -1){
			this.Cursor.on = true;
			if(typeof p != "object"){var p={layer:0,goodTileColor:"#00ff00",badTileColor:"#ff0000",tileLineWidth:4};};
			if(!p.hasOwnProperty('layer')){p.layer = 0;};
			if(!p.hasOwnProperty('goodTileColor')){p.goodTileColor = "#00ff00";};
			if(!p.hasOwnProperty('badTileColor')){p.badTileColor = "#ff0000";};
			if(!p.hasOwnProperty('tileLineWidth')){p.tileLineWidth = 4;};
			if(!p.hasOwnProperty('tileAlpha')){p.tileAlpha = 1;};	
			if(!p.hasOwnProperty('imageAlpha')){p.imageAlpha = 1;};			
			if(p.layer >= this.Scene.layers.length){p.layer = 0;};
			var x = this.Scene.tiledObjectSheets[tiledObjectIndex].startX;
			var y = this.Scene.tiledObjectSheets[tiledObjectIndex].startY;
			var w = this.Scene.tiledObjectSheets[tiledObjectIndex].width;
			var h = this.Scene.tiledObjectSheets[tiledObjectIndex].height;
			var rows = this.Scene.tiledObjectSheets[tiledObjectIndex].rows;
			var cols = this.Scene.tiledObjectSheets[tiledObjectIndex].cols;
			var tw = this.Scene.tiledObjectSheets[tiledObjectIndex].tileWidth;
			var th = this.Scene.tiledObjectSheets[tiledObjectIndex].tileHeight;
	
			this.Cursor.rect = {x:x,y:y,w:w,h:h};
			switch(this.Scene.Map.type){
				case "orthogonal":
					this.Cursor.point =	{x:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].x), y:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].y)-(h-this.Scene.Map.tileHeight)};
					break;
				case "isometric":
					//this.Cursor.point =	{x:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].x)-(w/2), y:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].y)-(h/2)};
					this.Cursor.point =	{x:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].x-((tw/2)*rows)), y:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].y-h+(th*rows)+((cols-rows)*th/2))};
					break;
				case "hexagonal":
					this.Cursor.point =	{x:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].x), y:Math.floor(this.Scene.Map.gridPoints[this.Pointer.tileOn.row][this.Pointer.tileOn.col].y)-(h-this.Scene.Map.tileHeight)};
					break;
			}
			var tiles = [];
			var numTilesAvailable = 0;
			var CursorColor = p.goodTileColor;
			var enoughTiles_fitsOnMap = true;
			var enoughTiles_otherTileObjects = true;
			for(var r=0;r<this.Scene.tiledObjectSheets[tiledObjectIndex].rows;r++){
				for(var c=0;c<this.Scene.tiledObjectSheets[tiledObjectIndex].cols;c++){
					if(this.Pointer.tileOn.row+r < this.Scene.Map.tilesHigh && this.Pointer.tileOn.col+c < this.Scene.Map.tilesWide){
					
						if(this.Scene.layers[p.layer].tiledObjectIDs[this.Pointer.tileOn.row+r][this.Pointer.tileOn.col+c] == 0 && this.Scene.layers[p.layer].tileIDs[this.Pointer.tileOn.row+r][this.Pointer.tileOn.col+c] == 0){
							CursorColor = p.goodTileColor;
							numTilesAvailable += 1;
						}else{
							CursorColor = p.badTileColor;
							enoughTiles_otherTileObjects = false;
						}
						tiles.push({row:this.Pointer.tileOn.row+r,col:this.Pointer.tileOn.col+c,color:CursorColor,width:p.tileLineWidth});
					
					}else{
						enoughTiles_fitsOnMap = false;
					}
				}
			}
			
			if(enoughTiles_fitsOnMap == true){
				if(enoughTiles_otherTileObjects	== true){		
					this.Cursor.image = this.Scene.tiledObjectSheets[tiledObjectIndex].image;
					this.Cursor.imageAlpha = p.imageAlpha;
				}else{
					this.Cursor.image = null;
					this.Cursor.imageAlpha = 1;
					okToDrawTiledObject = false;
				}
			}else{
				//turn all tile red	
				var numTiles = tiles.length;
				for(var t=0;t<numTiles;t++){
					tiles[t].color =  p.badTileColor;
				}
				this.Cursor.image = null;
				this.Cursor.imageAlpha = 1;
				okToDrawTiledObject = false;
			}
			this.Cursor.tiles = tiles;
			this.Cursor.tileAlpha = p.tileAlpha;
		}else{
			this.Cursor.on = false;
			this.Cursor.image = null;
			this.Cursor.imageAlpha = 1;
			this.Cursor.tiles = [];
			this.Cursor.tileAlpha = 1;
			okToDrawTiledObject = false;
		}
	//mouse not on Map
	}else{
		this.Cursor.on = false;
		this.Cursor.image = null;
		this.Cursor.imageAlpha = 1;
		this.Cursor.tiles = [];
		this.Cursor.tileAlpha = 1;
		okToDrawTiledObject = false;
	}
	
	return okToDrawTiledObject;
}
//------------------------------------------------------------------
//END TILED OBJECT PREVIEW


//TILED OBJECT SELECT
//Returns the index of a tiled object under pointer, and can draw tiles indicating its location
//------------------------------------------------------------------
FLAGENGINE.prototype.tiledObjectSelect = function(p){
	var tiledObjectName = null;
	var tiledObjectIndex = -1;
	this.Cursor.on = false;
	if(this.Pointer.tileOn.row >= 0 && this.Pointer.tileOn.row < this.Scene.Map.tilesHigh && this.Pointer.tileOn.col >= 0 && this.Pointer.tileOn.col < this.Scene.Map.tilesWide){
		if(typeof p != "object"){var p={layer:0,tilesOn:false,tileColor:"#00ff00",tileLineWidth:4,tileAlpha:1};};
		if(!p.hasOwnProperty('layer')){p.layer = 0;};
		if(!p.hasOwnProperty('tilesOn')){p.tilesOn = false;};
		if(!p.hasOwnProperty('tileColor')){p.tileColor = "#00ff00";};
		if(!p.hasOwnProperty('tileLineWidth')){p.tileLineWidth = 4;};
		if(!p.hasOwnProperty('tileAlpha')){p.tileAlpha = 1;};
		if(p.layer >= this.Scene.layers.length){p.layer = 0;};
		if(this.Scene.layers[p.layer].tiledObjectIDs[this.Pointer.tileOn.row][this.Pointer.tileOn.col] != 0){
			//get the index of the tiled object
			tiledObjectIndex = this.Scene.layers[p.layer].tiledObjectIDs[this.Pointer.tileOn.row][this.Pointer.tileOn.col]-1;
			var tiledObjectSheet = POLE.tiledObjectSheets[this.Scene.tiledObjects[tiledObjectIndex].pIndex];
			
			var tiles = [];
			if(p.tilesOn == true){
				this.Cursor.on = true;
				for(var r=0;r<tiledObjectSheet.numTiles.h;r++){
					for(var c=0;c<tiledObjectSheet.numTiles.w;c++){
						tiles.push({row:this.Scene.tiledObjects[tiledObjectIndex].row+r,col:this.Scene.tiledObjects[tiledObjectIndex].col+c,color:p.tileColor,width:p.tileLineWidth});
					}
				}
			}
			
			this.Cursor.image = null;
			this.Cursor.tiles = tiles;
			this.Cursor.tileAlpha = p.tileAlpha
		}
	}
	
	return tiledObjectIndex;
}
//------------------------------------------------------------------
//END TILED OBJECT SELECT 


//TILE REDUCTION
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.tileReduction = function(){
	var numActors = this.Scene.actors.length;
	var numLayers = this.Scene.layers.length;
	switch(this.Scene.Map.type){
		case "orthogonal":
			//for grid
			this.tilesToDraw.col.first = Math.round((0-(this.Scene.Map.x*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale))-Math.round(this.tGutter.w);
			if(this.tilesToDraw.col.first <= 0){this.tilesToDraw.col.first = 0;}
			if(this.tilesToDraw.col.first > this.Scene.Map.tilesWide){this.tilesToDraw.col.first = this.Scene.Map.tilesWide;}
			this.tilesToDraw.col.last  = Math.round((this.Canvas.width-(this.Scene.Map.x*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale)) + Math.round(this.tGutter.w);
			if(this.tilesToDraw.col.last > this.Scene.Map.tilesWide){this.tilesToDraw.col.last = this.Scene.Map.tilesWide;};
			if(this.tilesToDraw.col.last <= 0){this.tilesToDraw.col.last = 0;};
			
			this.tilesToDraw.row.first = Math.round((0-(this.Scene.Map.y*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale))-Math.round(this.tGutter.h);
			if(this.tilesToDraw.row.first <= 0){this.tilesToDraw.row.first = 0;}
			if(this.tilesToDraw.row.first > this.Scene.Map.tilesHigh){this.tilesToDraw.row.first = this.Scene.Map.tilesHigh;}
			this.tilesToDraw.row.last = Math.round((this.Canvas.height-(this.Scene.Map.y*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale)) + Math.round(this.tGutter.h);
			if(this.tilesToDraw.row.last > this.Scene.Map.tilesHigh){this.tilesToDraw.row.last = this.Scene.Map.tilesHigh;};
			if(this.tilesToDraw.row.last <= 0){this.tilesToDraw.row.last = 0;};
							
			//for tiles
			for(var k=0;k<numLayers;k++){
				this.Scene.layers[k].drawTileBounds.col.first = Math.round((0-((this.Scene.Map.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale))-Math.round(this.tGutter.w);
				if(this.Scene.layers[k].drawTileBounds.col.first <= 0){this.Scene.layers[k].drawTileBounds.col.first = 0;}
				if(this.Scene.layers[k].drawTileBounds.col.first > this.Scene.Map.tilesWide){this.Scene.layers[k].drawTileBounds.col.first = this.Scene.Map.tilesWide;}
				this.Scene.layers[k].drawTileBounds.col.last  = Math.round((this.Canvas.width-((this.Scene.Map.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale)) + Math.round(this.tGutter.w);
				if(this.Scene.layers[k].drawTileBounds.col.last > this.Scene.Map.tilesWide){this.Scene.layers[k].drawTileBounds.col.last = this.Scene.Map.tilesWide;};
				if(this.Scene.layers[k].drawTileBounds.col.last <= 0){this.Scene.layers[k].drawTileBounds.col.last = 0;};
			
				this.Scene.layers[k].drawTileBounds.row.first = Math.round((0-((this.Scene.Map.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale))-Math.round(this.tGutter.h);
				if(this.Scene.layers[k].drawTileBounds.row.first <= 0){this.Scene.layers[k].drawTileBounds.row.first = 0;}
				if(this.Scene.layers[k].drawTileBounds.row.first > this.Scene.Map.tilesHigh){this.Scene.layers[k].drawTileBounds.row.first = this.Scene.Map.tilesHigh;}
				this.Scene.layers[k].drawTileBounds.row.last = Math.round((this.Canvas.height-((this.Scene.Map.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y)))*this.Scene.scale)/(this.Scene.Map.tileHeight*this.Scene.scale)) + Math.round(this.tGutter.h);
				if(this.Scene.layers[k].drawTileBounds.row.last > this.Scene.Map.tilesHigh){this.Scene.layers[k].drawTileBounds.row.last = this.Scene.Map.tilesHigh;};
				if(this.Scene.layers[k].drawTileBounds.row.last <= 0){this.Scene.layers[k].drawTileBounds.row.last = 0;};
			}
			break;	
		case "isometric":
			//for grid			
			this.tilesToDrawIso = [];
			for(var i=0;i<this.Scene.Map.tilesHigh;i++){
				for(var j=0;j<this.Scene.Map.tilesWide;j++){
					//left check
					if((this.Scene.Map.gridPoints[i][j].x + this.Scene.Map.x + ((this.Scene.Map.tileWidth/2)*this.tGutter.w))*(this.Scene.scale) > 0){
						//right check
						if((this.Scene.Map.gridPoints[i][j].x + this.Scene.Map.x - ((this.Scene.Map.tileWidth/2)*this.tGutter.w))*(this.Scene.scale) < this.Canvas.width){
							//top check 
							if((this.Scene.Map.gridPoints[i][j].y + this.Scene.Map.y + (this.Scene.Map.tileHeight*this.tGutter.h))*(this.Scene.scale) > 0){
								//bottom check for tiles
								if((this.Scene.Map.gridPoints[i][j].y + this.Scene.Map.y-(this.Scene.Map.tileHeight*this.tGutter.h))*(this.Scene.scale) < this.Canvas.height){
									this.tilesToDrawIso.push({row:i,col:j});
								}
							}
						}
					}
				}
			};
			
			//for tiles
			for(var k=0;k<numLayers;k++){
				this.Scene.layers[k].tilesToDrawIso = [];
				for(var i=0;i<this.Scene.Map.tilesHigh;i++){
					for(var j=0;j<this.Scene.Map.tilesWide;j++){
						//left check
						if((this.Scene.Map.gridPoints[i][j].x + this.Scene.Map.x + ((this.Scene.Map.tileWidth/2)*this.tGutter.w) + this.Scene.layers[0].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*(this.Scene.scale) > 0){
							//right check
							if((this.Scene.Map.gridPoints[i][j].x + this.Scene.Map.x - ((this.Scene.Map.tileWidth/2)*this.tGutter.w) + this.Scene.layers[0].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*(this.Scene.scale) < this.Canvas.width){
								//top check 
								if((this.Scene.Map.gridPoints[i][j].y + this.Scene.Map.y + (this.Scene.Map.tileHeight*this.tGutter.h) + this.Scene.layers[0].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))*(this.Scene.scale) > 0){
									//bottom check for tiles
									if((this.Scene.Map.gridPoints[i][j].y + this.Scene.Map.y-(this.Scene.Map.tileHeight*this.tGutter.h) + this.Scene.layers[0].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))*(this.Scene.scale) < this.Canvas.height){
										this.Scene.layers[k].tilesToDrawIso.push({row:i,col:j});
									}
								}
							}
						}
					}
				};
			}	
			break;
		case "hexagonal":
			//for grid
			this.tilesToDraw.col.first = Math.round((0-(this.Scene.Map.x*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale))-Math.round(this.tGutter.w);
			if(this.tilesToDraw.col.first <= 0){this.tilesToDraw.col.first = 0;}
			if(this.tilesToDraw.col.first > this.Scene.Map.tilesWide){this.tilesToDraw.col.first = this.Scene.Map.tilesWide;}
			this.tilesToDraw.col.last = Math.round((this.Canvas.width-(this.Scene.Map.x*this.Scene.scale))/((this.Scene.Map.tileWidth*.75)*this.Scene.scale)) + Math.round(this.tGutter.w);
			if(this.tilesToDraw.col.last > this.Scene.Map.tilesWide){this.tilesToDraw.col.last = this.Scene.Map.tilesWide;};
			if(this.tilesToDraw.col.last <= 0){this.tilesToDraw.col.last = 0;};
			
			this.tilesToDraw.row.first = Math.round((0-(this.Scene.Map.y*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale))-Math.round(this.tGutter.h);
			if(this.tilesToDraw.row.first <= 0){this.tilesToDraw.row.first = 0;}
			if(this.tilesToDraw.row.first > this.Scene.Map.tilesHigh){this.tilesToDraw.row.first = this.Scene.Map.tilesHigh;}
			this.tilesToDraw.row.last = Math.round((this.Canvas.height-(this.Scene.Map.y*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale)) +Math.round(this.tGutter.h);
			if(this.tilesToDraw.row.last > this.Scene.Map.tilesHigh){this.tilesToDraw.row.last = this.Scene.Map.tilesHigh;};
			if(this.tilesToDraw.row.last <= 0){this.tilesToDraw.row.last = 0;};
							
			//for tiles
			for(var k=0;k<numLayers;k++){
				this.Scene.layers[k].drawTileBounds.col.first = Math.round((0-((this.Scene.Map.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*this.Scene.scale))/(this.Scene.Map.tileWidth*this.Scene.scale))-Math.round(this.tGutter.w);
				if(this.Scene.layers[k].drawTileBounds.col.first <= 0){this.Scene.layers[k].drawTileBounds.col.first = 0;}
				if(this.Scene.layers[k].drawTileBounds.col.first > this.Scene.Map.tilesWide){this.Scene.layers[k].drawTileBounds.col.first = this.Scene.Map.tilesWide;}
				this.Scene.layers[k].drawTileBounds.col.last  = Math.round((this.Canvas.width-((this.Scene.Map.x + this.Scene.layers[k].offset.x + (this.Scene.Map.camLoc.x * this.Scene.layers[k].offsetScroll.x))*this.Scene.scale))/((this.Scene.Map.tileWidth*.75)*this.Scene.scale))+Math.round(this.tGutter.w);
				if(this.Scene.layers[k].drawTileBounds.col.last > this.Scene.Map.tilesWide){this.Scene.layers[k].drawTileBounds.col.last = this.Scene.Map.tilesWide;};
				if(this.Scene.layers[k].drawTileBounds.col.last <= 0){this.Scene.layers[k].drawTileBounds.col.last = 0;};
			
				this.Scene.layers[k].drawTileBounds.row.first = Math.round((0-((this.Scene.Map.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale))-Math.round(this.tGutter.h);
				if(this.Scene.layers[k].drawTileBounds.row.first <= 0){this.Scene.layers[k].drawTileBounds.row.first = 0;}
				if(this.Scene.layers[k].drawTileBounds.row.first > this.Scene.Map.tilesHigh){this.Scene.layers[k].drawTileBounds.row.first = this.Scene.Map.tilesHigh;}
				this.Scene.layers[k].drawTileBounds.row.last = Math.round((this.Canvas.height-((this.Scene.Map.y + this.Scene.layers[k].offset.y + (this.Scene.Map.camLoc.y * this.Scene.layers[k].offsetScroll.y))*this.Scene.scale))/(this.Scene.Map.tileHeight*this.Scene.scale))+Math.round(this.tGutter.h);
				if(this.Scene.layers[k].drawTileBounds.row.last > this.Scene.Map.tilesHigh){this.Scene.layers[k].drawTileBounds.row.last = this.Scene.Map.tilesHigh;};
				if(this.Scene.layers[k].drawTileBounds.row.last <= 0){this.Scene.layers[k].drawTileBounds.row.last = 0;};
			}
			break;
	}
}

//------------------------------------------------------------------
//------------------------------------------------------------------
//END TILE REDUCTION


//TILE SPRITES
//Return a tile sprite in the scene
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.TileSprite = function(instanceName){
	var numTileSprites = this.Scene.tileSprites.length;
	for(var ts=0;ts<numTileSprites;ts++){
		if(this.Scene.tileSprites[ts].name == instanceName){
			return this.Scene.tileSprites[ts];
		}
	}
}

//------------------------------------------------------------------
//------------------------------------------------------------------
//END TILE SPRITES


//TOUCH LISTENERS
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.touchDown = function(e){
 	//allow for body margin left
	var style = window.getComputedStyle(document.body),
    marginLeft = Number(style.getPropertyValue('margin-left').slice(0,-2));
 
 	if(this.Scene != null){
    	this.Pointer.downLoc.x = e.targetTouches[0].pageX - (this.Scene.Map.x*(this.scale)*(this.Scene.scale));
    	this.Pointer.downLoc.y = e.targetTouches[0].pageY - (this.Scene.Map.y*(this.scale)*(this.Scene.scale));
    }
	this.Pointer.screenLoc.x = e.targetTouches[0].pageX;
	this.Pointer.screenLoc.y = e.targetTouches[0].pageY;	
	if(this.Scene != null){
   		this.Pointer.mapLoc.x = (((this.Pointer.screenLoc.x - marginLeft) -((this.Scene.Map.x*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
    	this.Pointer.mapLoc.y = ((this.Pointer.screenLoc.y -((this.Scene.Map.y*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
    }
 
	if(this.Scene != null && this.Scene.touchDown != null){
		this.Scene.touchDown(e);
	}
}

FLAGENGINE.prototype.touchMove = function(e){	
	//allow for body margin left
	var style = window.getComputedStyle(document.body),
    marginLeft = Number(style.getPropertyValue('margin-left').slice(0,-2));

	this.Pointer.screenLoc.x = e.targetTouches[0].pageX;
	this.Pointer.screenLoc.y = e.targetTouches[0].pageY;
	if(this.Scene != null){
   	 	this.Pointer.mapLoc.x = ((((this.Pointer.screenLoc.x - marginLeft) -((this.Scene.Map.x*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
    	this.Pointer.mapLoc.y = ((this.Pointer.screenLoc.y -((this.Scene.Map.y*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale);
    }

	if(this.Scene != null && this.Scene.touchMove != null){
		this.Scene.touchMove(e);
	}	
}

FLAGENGINE.prototype.touchOut =  function(e){
	if(this.Scene != null && this.Scene.touchOut != null){
		this.Scene.touchOut(e);
	}
}


FLAGENGINE.prototype.touchUp = function(e){
	if(this.Scene != null && this.Scene.touchUp != null){
		this.Scene.touchUp(e);
	}
}
//------------------------------------------------------------------
//------------------------------------------------------------------
//END TOUCH LISTENERS


//TWEEN METHODS
//the tweening algorithms
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.Tween = function(object, property, targetVal, duration, ease, onComplete){
	var startTime = new Date;
	var unit = null;
	//if the targetVal is a string
	if(isNaN(targetVal) == true){
		if(targetVal.substr(targetVal.length - 1) == "%"){
			targetVal = Number(targetVal.slice(0,-1));
			unit = "%";
		}else if(targetVal.substr(targetVal.length - 2) == "px"){
			targetVal = Number(targetVal.slice(0,-2));
			unit = "px";
		}
	}
	
	var b = null;
	//if property is css
	switch(property){
		case "left":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('left');
    		object = object.style;
    		break;
    	case "letter-spacing":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('letter-spacing');
    		object = object.style;
    		break;
    	case "margin-left":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('margin-left');
    		object = object.style;
    		break;
    	case "margin-top":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('margin-top');
    		object = object.style;
    		break;
    	case "opacity":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('opacity');
    		b = parseFloat(b);
    		object = object.style;
    		break;
    	case "right":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('right');
    		object = object.style;
    		break;
    	case "top":
			var style = window.getComputedStyle(object),
    		b = style.getPropertyValue('top');
    		object = object.style;
    		break;
    	default:
    		b = object[property];
    		break;
	}
	
	//if the b is a string
	if(isNaN(b) == true){
		if(b.substr(b.length - 1) == "%"){
			b = Number(b.slice(0,-1));
			unit = "%";
		}else if(b.substr(b.length - 2) == "px"){
			b = Number(b.slice(0,-2));
			unit = "px";
		}
	}
	
	var c = targetVal - b;
	var d = duration*1000 || 1000;
	var ease = ease || this.linear;
	var onComplete = onComplete || null;
	
	this.Scene.tweens.push({startTime:startTime, object:object, property:property, targetVal:targetVal, b:b, c:c, d:d, ease:ease, onComplete:onComplete, unit:unit});
}

FLAGENGINE.prototype.linear = function (t, b, c, d) {
	return c*t/d + b;
};

FLAGENGINE.prototype.easeInBack = function (t, b, c, d, s) {
	if (s == undefined) s = 1.70158;
	return c*(t/=d)*t*((s+1)*t - s) + b;
};

FLAGENGINE.prototype.easeOutBack = function (t, b, c, d, s) {
	if (s == undefined) s = 1.70158;
	return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};

FLAGENGINE.prototype.easeInOutBack = function (t, b, c, d, s) {
	if (s == undefined) s = 1.70158;
	if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
	return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
};

FLAGENGINE.prototype.easeInBounce = function (t, b, c, d) {
	return c - FLAG.easeOutBounce (d-t, 0, c, d) + b;
};

FLAGENGINE.prototype.easeOutBounce = function (t, b, c, d) {
	if ((t/=d) < (1/2.75)) {
		return c*(7.5625*t*t) + b;
	} else if (t < (2/2.75)) {
		return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
	} else if (t < (2.5/2.75)) {
		return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
	} else {
		return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
	}
};

FLAGENGINE.prototype.easeInOutBounce = function (t, b, c, d) {
	if (t < d/2) return FLAG.easeInBounce (t*2, 0, c, d) * .5 + b;
	return FLAG.easeOutBounce (t*2-d, 0, c, d) * .5 + c*.5 + b;
};

FLAGENGINE.prototype.easeInCirc = function (t, b, c, d) {
	t /= d;
	return -c * (Math.sqrt(1 - t*t) - 1) + b;
};

FLAGENGINE.prototype.easeOutCirc = function (t, b, c, d) {
	t /= d;
	t--;
	return c * Math.sqrt(1 - t*t) + b;
};

FLAGENGINE.prototype.easeInOutCirc = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
	t -= 2;
	return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
};

FLAGENGINE.prototype.easeInCubic = function (t, b, c, d) {
	t /= d;
	return c*t*t*t + b;
};

FLAGENGINE.prototype.easeOutCubic = function (t, b, c, d) {
	t /= d;
	t--;
	return c*(t*t*t + 1) + b;
};

FLAGENGINE.prototype.easeInOutCubic = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t*t + b;
	t -= 2;
	return c/2*(t*t*t + 2) + b;
};

FLAGENGINE.prototype.easeInExplode = function (t, b, c, d) {
	return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
};

FLAGENGINE.prototype.easeOutExplode = function (t, b, c, d) {
	return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
};

FLAGENGINE.prototype.easeInOutExplode = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
	t--;
	return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
};

FLAGENGINE.prototype.easeInSine = function (t, b, c, d) {
	return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
};

FLAGENGINE.prototype.easeOutSine = function (t, b, c, d) {
	return c * Math.sin(t/d * (Math.PI/2)) + b;
};

FLAGENGINE.prototype.easeInOutSine = function (t, b, c, d) {
	return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
};

FLAGENGINE.prototype.easeInQuad = function (t, b, c, d) {
	t /= d;
	return c*t*t + b;
};

FLAGENGINE.prototype.easeOutQuad = function (t, b, c, d) {
	t /= d;
	return -c * t*(t-2) + b;
};

FLAGENGINE.prototype.easeInOutQuad = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
};

FLAGENGINE.prototype.easeInQuart = function (t, b, c, d) {
	t /= d;
	return c*t*t*t*t + b;
};

FLAGENGINE.prototype.easeOutQuart = function (t, b, c, d) {
	t /= d;
	t--;
	return -c * (t*t*t*t - 1) + b;
};

FLAGENGINE.prototype.easeInOutQuart = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t*t*t + b;
	t -= 2;
	return -c/2 * (t*t*t*t - 2) + b;
};

FLAGENGINE.prototype.easeInQuint = function (t, b, c, d) {
	t /= d;
	return c*t*t*t*t*t + b;
};

FLAGENGINE.prototype.easeOutQuint = function (t, b, c, d) {
	t /= d;
	t--;
	return c*(t*t*t*t*t + 1) + b;
};

FLAGENGINE.prototype.easeInOutQuint = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t*t*t*t + b;
	t -= 2;
	return c/2*(t*t*t*t*t + 2) + b;
};
//------------------------------------------------------------------
//END TWEEN METHODS


//UPDATE
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.update = function(){

	//SCENE
	//update mouse actions
	if(this.Scene.dragging == true){
		this.Scene.Map.x = Math.floor(((this.Pointer.screenLoc.x - this.Pointer.downLoc.x)*(1/(this.scale)))*(1/this.Scene.scale));
		this.Scene.Map.y = Math.floor(((this.Pointer.screenLoc.y - this.Pointer.downLoc.y)*(1/(this.scale)))*(1/this.Scene.scale));
	}else{
		//keep the Map on whole pixels
		this.Scene.Map.x = Math.floor(this.Scene.Map.x);
		this.Scene.Map.y = Math.floor(this.Scene.Map.y);
	}

		
	//POINTER
	//POINTER TILE
	switch(this.Scene.Map.type){
		case "orthogonal":
			var tileWs = this.Scene.Map.tileWidth;
			var tileHs = this.Scene.Map.tileHeight;
			this.Pointer.tileOn.col = Math.floor(this.Pointer.mapLoc.x/tileWs);
			this.Pointer.tileOn.row = Math.floor(this.Pointer.mapLoc.y/tileHs);
			this.Scene.Map.camLoc.x = Math.floor((((this.center.x*this.scale)-(((this.Scene.Map.x+(this.Scene.Map.w/2))*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			this.Scene.Map.camLoc.y = Math.floor((((this.center.y*this.scale)-(((this.Scene.Map.y+(this.Scene.Map.h/2))*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			break;	
		case "isometric":
			var tileWs = this.Scene.Map.tileWidth;
			var tileHs = this.Scene.Map.tileHeight;
			this.Pointer.tileOn.col = Math.floor((this.Pointer.mapLoc.x/tileWs)+(this.Pointer.mapLoc.y/(tileWs/2)));
			this.Pointer.tileOn.row = Math.floor(-(this.Pointer.mapLoc.x/tileWs) + (this.Pointer.mapLoc.y/(tileWs/2))-.5);
			var suspectedTile = {row:this.Pointer.tileOn.row,col:this.Pointer.tileOn.col};
			var point = {x:this.Pointer.mapLoc.x,y:this.Pointer.mapLoc.y};
			var tile = this.pointToIsoTile(point,suspectedTile);
			this.Pointer.tileOn.col = tile.col;
			this.Pointer.tileOn.row = tile.row;
			this.Scene.Map.camLoc.x = Math.floor((((this.center.x*this.scale)-(((this.Scene.Map.x)*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			this.Scene.Map.camLoc.y = Math.floor((((this.center.y*this.scale)-(((this.Scene.Map.y+(this.Scene.Map.h/2))*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			break;
		case "hexagonal":
			var tileWs = this.Scene.Map.tileWidth;
			var tileHs = this.Scene.Map.tileHeight;
			this.Pointer.tileOn.col = Math.floor(this.Pointer.mapLoc.x/(tileWs*.5)/1.5);
			this.Pointer.tileOn.row = Math.floor((this.Pointer.mapLoc.y-(this.Pointer.tileOn.col%2)*tileHs/2)/tileHs);
			var suspectedTile = {row:this.Pointer.tileOn.row,col:this.Pointer.tileOn.col};
			var point = {x:this.Pointer.mapLoc.x,y:this.Pointer.mapLoc.y};
			var tile = this.pointToHexTile(point,suspectedTile);
			this.Pointer.tileOn.col = tile.col;
			this.Pointer.tileOn.row = tile.row;
			this.Scene.Map.camLoc.x = Math.floor((((this.center.x*this.scale)-(((this.Scene.Map.x+(this.Scene.Map.w/2))*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			this.Scene.Map.camLoc.y = Math.floor((((this.center.y*this.scale)-(((this.Scene.Map.y+(this.Scene.Map.h/2))*(this.scale)))*(this.Scene.scale)) / (this.Scene.scale)) / (this.scale));
			break;
	}
	
	//POINTER ON MAP
	if(this.Pointer.tileOn.row >= 0 && this.Pointer.tileOn.row < this.Scene.Map.tilesHigh && this.Pointer.tileOn.col >= 0 && this.Pointer.tileOn.col < this.Scene.Map.tilesWide){
		this.Pointer.onMap = true;
	}else{
		this.Pointer.onMap = false;
	}
	
	//SCENE UPDATE
	//any game specific action that has to do with a scene
	if(this.Scene.update != null){
		this.Scene.update();
	}

	//TILE REDUCTION
	//so that only tiles, actors and sprites that can been seen are drawn
	if(this.Scene.Map.lastX != this.Scene.Map.x || this.Scene.Map.lastY != this.Scene.Map.y || this.lastW != this.Canvas.width || this.lastH != this.Canvas.height){
		this.tileReduction();
	}

	//ACTORS
	var numActors = this.Scene.actors.length;
	for(var i=0;i<numActors;i++){
		//BODIES
		var numBodies = this.Scene.actors[i].bodies.length;
		var bodiesToKeep = [];
		var bodiesToDestroy = [];
		for(var j=0;j<numBodies;j++){
			var b = this.Scene.actors[i].bodies[j].fb2Body;
			//DESTROY?
			//check if body has been labled to be destroyed
			if(this.Scene.actors[i].bodies[j].name == "destroy" || this.Scene.actors[i].bodies[j].fb2Body.GetUserData().name == "destroy"){
				bodiesToDestroy.push(this.Scene.actors[i].bodies[j]);
			}else{
				bodiesToKeep.push(this.Scene.actors[i].bodies[j]);
				
				//BODY and BODY SPRITE LOCATION
				var x = (b.GetPosition().x*this.Box2D.scale);
				var y = (b.GetPosition().y*this.Box2D.scale);
				this.Scene.actors[i].bodies[j].position = {x:x,y:y};
				if(this.Scene.actors[i].bodies[j].Sprite != null){
					this.Scene.actors[i].bodies[j].Sprite.x = x;
					this.Scene.actors[i].bodies[j].Sprite.y = y;
				}
				
				//TILE ON
				//update what tile the actor is on
				if(this.Scene.Map.type == "orthogonal"){
					this.Scene.actors[i].bodies[j].tileOn.col = Math.floor(x/this.Scene.Map.tileWidth);
					this.Scene.actors[i].bodies[j].tileOn.row = Math.floor(y/this.Scene.Map.tileHeight);
				}else if(this.Scene.Map.type == "isometric"){
					this.Scene.actors[i].bodies[j].tileOn.col = Math.round(((x)/this.Scene.Map.tileWidth)+((y)/(this.Scene.Map.tileWidth/2)))-1;
					this.Scene.actors[i].bodies[j].tileOn.row = Math.round(-((x))/this.Scene.Map.tileWidth + ((y)/(this.Scene.Map.tileWidth/2))-.5);
					var suspectedTile = {row:this.Scene.actors[i].bodies[j].tileOn.row,col:this.Scene.actors[i].bodies[j].tileOn.col};
					var point = {x:x,y:y};
					var tile = this.pointToIsoTile(point,suspectedTile);
					this.Scene.actors[i].bodies[j].tileOn.col = tile.col;
					this.Scene.actors[i].bodies[j].tileOn.row = tile.row;
				}else if(this.Scene.Map.type == "hexagonal"){
					this.Scene.actors[i].bodies[j].tileOn.col = Math.floor(x/(this.Scene.Map.tileWidth*.5)/1.5);
					this.Scene.actors[i].bodies[j].tileOn.row = Math.floor((y-(this.Scene.actors[i].bodies[j].tileOn.col%2)*this.Scene.Map.tileHeight/2)/this.Scene.Map.tileHeight);
					var suspectedTile = {row:this.Scene.actors[i].bodies[j].tileOn.row,col:this.Scene.actors[i].bodies[j].tileOn.col};
					var point = {x:x,y:y};
					var tile = this.pointToHexTile(point,suspectedTile);
					this.Scene.actors[i].bodies[j].tileOn.col = tile.col;
					this.Scene.actors[i].bodies[j].tileOn.row = tile.row;
				}	
				//ASTAR TILE PATH - BODIES
				if(this.Scene.actors[i].bodies[j].aStarResult != null && this.Scene.actors[i].bodies[j].aStarResult.length > 0){
					this.Scene.actors[i].bodies[j].travelTilePath();
				}	
			}
		}
		
		//rebuild body list, eliminate bodies who have been destroyed
		this.Scene.actors[i].bodies = [];
		this.Scene.actors[i].bodies = bodiesToKeep;
		//destroy the bodies from the world
		var numToDestroy = bodiesToDestroy.length;
		for(var d=0;d<numToDestroy;d++){
			this.Box2D.world.DestroyBody(bodiesToDestroy[d].fb2Body);
		}
		
		//JOINTS
		var numJoints = this.Scene.actors[i].joints.length;
		var jointsToKeep = [];
		var jointsToDestroy = [];
		for(var j=0;j<numJoints;j++){
			if(this.Scene.actors[i].joints[j].name == "destroy"){
				jointsToDestroy.push(this.Scene.actors[i].joints[j]);
			}else{
				jointsToKeep.push(this.Scene.actors[i].joints[j]);
			}
		}
		this.Scene.actors[i].joints = [];
		this.Scene.actors[i].joints = jointsToKeep;
		var numToDestroy = jointsToDestroy.length;
		for(var d=0;d<numToDestroy;d++){
			FLAG.Box2D.world.DestroyJoint(jointsToDestroy[d].fb2Joint);
		}
	}
	
	//rebuild actors list, eliminate any actors who have zero bodies
	var actorsRebuild = [];
	for(i=0;i<numActors;i++){
		var numBodies = this.Scene.actors[i].bodies.length;
		if(numBodies > 0){
			//keeps Scene index of Actor
			this.Scene.actors[i].sIndex = i;
			actorsRebuild.push(this.Scene.actors[i]);
		}
	}
	this.Scene.actors = [];
	this.Scene.actors = actorsRebuild;
	
	//ACTOR UPDATES
	numActors = this.Scene.actors.length;
	for(i=0;i<numActors;i++){
		if(this.Scene.actors[i].update != null){
			this.Scene.actors[i].update();
		}
	}	
	
	//SPRITES
	var numSprites = this.Scene.sprites.length;
	for(var i=0;i<numSprites;i++){
		//update what tile the sprite is on
		if(this.Scene.Map.type == "orthogonal"){
			var x = (this.Scene.sprites[i].x);
			var y = (this.Scene.sprites[i].y);
			this.Scene.sprites[i].tileOn.col = Math.floor(x/this.Scene.Map.tileWidth);
			this.Scene.sprites[i].tileOn.row = Math.floor(y/this.Scene.Map.tileHeight);
		}else if(this.Scene.Map.type == "isometric"){
			var x = (this.Scene.sprites[i].x);
			var y = (this.Scene.sprites[i].y);
			this.Scene.sprites[i].tileOn.col = Math.round(((x)/this.Scene.Map.tileWidth)+((y)/(this.Scene.Map.tileWidth/2)))-1;
			this.Scene.sprites[i].tileOn.row = Math.round(-((x))/this.Scene.Map.tileWidth + ((y)/(this.Scene.Map.tileWidth/2))-.5);
			var suspectedTile = {row:this.Scene.sprites[i].tileOn.row,col:this.Scene.sprites[i].tileOn.col};
			var point = {x:x,y:y};
			var tile = this.pointToIsoTile(point,suspectedTile);
			this.Scene.sprites[i].tileOn.col = tile.col;
			this.Scene.sprites[i].tileOn.row = tile.row;
		}else if(this.Scene.Map.type == "hexagonal"){
			var x = (this.Scene.sprites[i].x);
			var y = (this.Scene.sprites[i].y);
			this.Scene.sprites[i].tileOn.col = Math.floor(x/(this.Scene.Map.tileWidth*.5)/1.5);
			this.Scene.sprites[i].tileOn.row = Math.floor((y-(this.Scene.sprites[i].tileOn.col%2)*this.Scene.Map.tileHeight/2)/this.Scene.Map.tileHeight);
			var suspectedTile = {row:this.Scene.sprites[i].tileOn.row,col:this.Scene.sprites[i].tileOn.col};
			var point = {x:x,y:y};
			var tile = this.pointToHexTile(point,suspectedTile);
			this.Scene.sprites[i].tileOn.col = tile.col;
			this.Scene.sprites[i].tileOn.row = tile.row;
		}	

		//ASTAR TILE PATH
		if(this.Scene.sprites[i].aStarResult != null && this.Scene.sprites[i].aStarResult.length > 0){
			this.Scene.sprites[i].travelTilePath();
		}
		
		//keeps Scene index of Sprite
		this.Scene.sprites[i].sIndex = i;
		
		//SPRITE UPDATES
		if(this.Scene.sprites[i].update != null){
			this.Scene.sprites[i].update();
		}
	}
	
	//TWEENS
	var numTweens = this.Scene.tweens.length;
	var tweensRebuild = [];
	for(i=0;i<numTweens;i++){
		var t = new Date - this.Scene.tweens[i].startTime;
		if (t<=this.Scene.tweens[i].d) {
			if(this.Scene.tweens[i].unit != null){
				this.Scene.tweens[i].object[this.Scene.tweens[i].property] = this.Scene.tweens[i].ease(t, this.Scene.tweens[i].b, this.Scene.tweens[i].c, this.Scene.tweens[i].d)+this.Scene.tweens[i].unit;
			}else{
				this.Scene.tweens[i].object[this.Scene.tweens[i].property] = this.Scene.tweens[i].ease(t, this.Scene.tweens[i].b, this.Scene.tweens[i].c, this.Scene.tweens[i].d);
			}
			tweensRebuild.push(this.Scene.tweens[i]);
		}else{
			if(this.Scene.tweens[i].unit != null){
				this.Scene.tweens[i].object[this.Scene.tweens[i].property] = this.Scene.tweens[i].targetVal+this.Scene.tweens[i].unit;
			}else{
				this.Scene.tweens[i].object[this.Scene.tweens[i].property] = this.Scene.tweens[i].targetVal;
			}
			if(this.Scene.tweens[i].onComplete != null){this.Scene.tweens[i].onComplete();};
		}
	}
	this.Scene.tweens = [];
	this.Scene.tweens = tweensRebuild;
	
	//BOX2D
	this.Box2D.world.Step(this.Box2D.timeStep, this.Box2D.velIt, this.Box2D.posIt);		
	this.Box2D.world.ClearForces();
	
	//MAP LOCATION THIS UPDATE
	this.Scene.Map.lastX = Number(this.Scene.Map.x);
	this.Scene.Map.lastY = Number(this.Scene.Map.y);
	
	//CANVAS SIZE THIS UPDATE
	this.lastW = Number(this.Canvas.width);
	this.lastH = Number(this.Canvas.height);	
	
	//DRAW THE CANVAS
	if(this.running == true){
		switch(this.contextType){
			case "2d":
				this.draw();
				break;
			case "webgl":
				this.WebGL.update();
				break;
		}
	}
}

//------------------------------------------------------------------
//------------------------------------------------------------------
//END UPDATE


//ZOOM
//------------------------------------------------------------------
//------------------------------------------------------------------

FLAGENGINE.prototype.zoomIn = function(centerPoint){

	this.Scene.scale *= this.zoom.in;
	
	if(centerPoint === undefined){
	
		//centered on mouseLocMap, like a magnifying glass
		this.Scene.Map.x = Math.floor(-this.Pointer.mapLoc.x+(this.center.x/this.Scene.scale));
		this.Scene.Map.y = Math.floor(-this.Pointer.mapLoc.y+(this.center.y/this.Scene.scale));
	
	}else{
	
		//centered on centerPoint
		this.Scene.Map.x = Math.floor(-centerPoint.x + (this.center.x/this.Scene.scale));
		this.Scene.Map.y = Math.floor(-centerPoint.y + (this.center.y/this.Scene.scale));
	}
	
	//scale the game to fix interpolation
	this.scaleGame();
}

FLAGENGINE.prototype.zoomOut = function(centerPoint){
	
	this.Scene.scale *= this.zoom.out;
	
	if(centerPoint === undefined){
	
		//centered on mouseLocMap, like a magnifying glass
		this.Scene.Map.x = Math.floor(-this.Pointer.mapLoc.x+(this.center.x/this.Scene.scale));
		this.Scene.Map.y = Math.floor(-this.Pointer.mapLoc.y+(this.center.y/this.Scene.scale));
	
	}else{
	
		//centered on centerPoint
		this.Scene.Map.x = Math.floor(-centerPoint.x + (this.center.x/this.Scene.scale));
		this.Scene.Map.y = Math.floor(-centerPoint.y + (this.center.y/this.Scene.scale));	
	}
	
	//scale the game to fix interpolation
	this.scaleGame();
}

//------------------------------------------------------------------
//------------------------------------------------------------------
//END ZOOM


//FLAGWEBGL -- EXPERIMENTAL
//these are new functions for a webgl canvas
//------------------------------------------------------------------
//------------------------------------------------------------------

function FLAGWEBGL(canvas, context){
	
	//PROPERTIES
	this.models = [];						//holds all the models in the scene
	this.Context = context;					//context of canvas
	this.view_mtrx = mat4.create();			//controls the moving around and rotating of vertices
	this.projection_mtrx = mat4.create();	//controls proportion of things, farther away thing look smaller than close things
	this.textures = [];						//holds the textures in the scene
	this.lights = [];						//holds the light in the scene
	this.modelView_mtrx_stack = [];			//holds states of the model-view matrix
	
	this.camera  = new FLAGWEBGLCAMERA(canvas, this.view_mtrx, this.projection_mtrx);	//active camera from which the scene is rendered
	
	//cull backfaces
	this.Context.enable(this.Context.CULL_FACE);
}


//VERTEX SHADERS
//does graphics card code on vertices
//------------------------------------------------------------------

var defualt_vs = 	'attribute vec3 vertexPosition;';
defualt_vs += 		'attribute vec2 textureCoord;';

defualt_vs += 		'uniform mat4 view_mtrx;';
defualt_vs += 		'uniform mat4 projection_mtrx;';

defualt_vs += 		'varying vec2 vTextureCoord;';

defualt_vs += 		'void main(void) {';
defualt_vs += 			'gl_Position = projection_mtrx * view_mtrx * vec4(vertexPosition, 1.0);';
defualt_vs += 			'vTextureCoord = textureCoord;';
defualt_vs += 		'}';


//PER VERTEX
//variables that change from vertex to vertex
var perVertex_lighting_vs = 'attribute vec3 vertexPosition;';
perVertex_lighting_vs += 	'attribute vec3 vertexNormal;';
perVertex_lighting_vs += 	'attribute vec2 textureCoord;';

//uniform variables
perVertex_lighting_vs += 	'uniform mat4 view_mtrx;';
perVertex_lighting_vs += 	'uniform mat4 projection_mtrx;';
perVertex_lighting_vs += 	'uniform mat3 normal_mtrx;';
perVertex_lighting_vs += 	'uniform vec3 ambientColor;';
perVertex_lighting_vs += 	'uniform vec3 lightingDirection;';
perVertex_lighting_vs += 	'uniform vec3 directionalColor;';
perVertex_lighting_vs += 	'uniform bool useLighting;';

//output variables
perVertex_lighting_vs += 	'varying vec2 vTextureCoord;';
perVertex_lighting_vs += 	'varying vec3 vLightWeighting;';

perVertex_lighting_vs += 	'void main(void) {';
perVertex_lighting_vs += 		'gl_Position = projection_mtrx * view_mtrx * vec4(vertexPosition, 1.0);';
perVertex_lighting_vs += 		'vTextureCoord = textureCoord;';
perVertex_lighting_vs += 		'if(!useLighting){';
perVertex_lighting_vs += 			'vLightWeighting = vec3(1.0, 1.0, 1.0);';
perVertex_lighting_vs += 		'}else{';
perVertex_lighting_vs += 			'vec3 transformedNormal = normal_mtrx * vertexNormal;';
perVertex_lighting_vs += 			'float directionalLightWeighting = max(dot(transformedNormal, lightingDirection), 0.0);';
perVertex_lighting_vs += 			'vLightWeighting = ambientColor + directionalColor * directionalLightWeighting;';
perVertex_lighting_vs += 		'}';
perVertex_lighting_vs += 	'}';


//PER FRAGMENT
//variables that change from vertex to vertex
var perFrag_lighting_vs = 	'attribute vec3 vertexPosition;';
perFrag_lighting_vs += 		'attribute vec3 vertexNormal;';
perFrag_lighting_vs += 		'attribute vec2 textureCoord;';

//uniform variables
perFrag_lighting_vs += 		'uniform mat4 view_mtrx;';
perFrag_lighting_vs += 		'uniform mat4 projection_mtrx;';
perFrag_lighting_vs += 		'uniform mat3 normal_mtrx;';

//output variables
perFrag_lighting_vs += 		'varying vec2 vTextureCoord;';
perFrag_lighting_vs += 		'varying vec3 vTransformedNormal;';
perFrag_lighting_vs += 		'varying vec4 vPosition;';

perFrag_lighting_vs += 		'void main(void) {';
perFrag_lighting_vs += 			'vPosition = view_mtrx * vec4(vertexPosition, 1.0);';
perFrag_lighting_vs += 			'gl_Position = projection_mtrx * vPosition;';
perFrag_lighting_vs += 			'vTextureCoord = textureCoord;';
perFrag_lighting_vs += 			'vTransformedNormal = normal_mtrx * vertexNormal;';
perFrag_lighting_vs += 		'}';
//------------------------------------------------------------------
//END VERTEX SHADERS


//FRAGMENT SHADERS
//also sometimes referred to as pixel shader because it colors in the pixels between vertices
//first tell the graphics card how precise to be with floating point numbers, then defines a color
//------------------------------------------------------------------


var defualt_fs = 'precision mediump float;';

defualt_fs += 	'varying vec2 vTextureCoord;';

defualt_fs += 	'uniform sampler2D diffuse;';

defualt_fs += 	'void main(void) {';
defualt_fs += 		'gl_FragColor = texture2D(diffuse, vec2(vTextureCoord.s, vTextureCoord.t));';
defualt_fs += 	'}';


//PER VERTEX
//the vertex shader is generating an output variable called vColor which is used by the fragment shader using medium precision
var perVertex_lighting_fs = 'precision mediump float;';

//grab the vTextureCoord varying variable from the vertex shader
perVertex_lighting_fs += 	'varying vec2 vTextureCoord;';

//adjust the r,g,b pixels of the texture using lighting
perVertex_lighting_fs += 	'varying vec3 vLightWeighting;';

//non-varying uniform variable, the shaders way of representing the texture
perVertex_lighting_fs +=	'uniform sampler2D diffuse;';

//use the texture as the pixels
perVertex_lighting_fs +=	'void main(void) {';
perVertex_lighting_fs +=		'vec4 textureColor = texture2D(diffuse, vec2(vTextureCoord.s, vTextureCoord.t));';
perVertex_lighting_fs +=		'gl_FragColor = vec4(textureColor.rgb * vLightWeighting, textureColor.a);';
perVertex_lighting_fs +=	'}';


//PER FRAGMENT
var perFrag_lighting_fs = 	'precision mediump float;';

perFrag_lighting_fs +=		'varying vec2 vTextureCoord;';
perFrag_lighting_fs +=		'varying vec3 vTransformedNormal;';
perFrag_lighting_fs +=		'varying vec4 vPosition;';

perFrag_lighting_fs +=		'uniform bool useLighting;';
perFrag_lighting_fs +=		'uniform bool useTextures;';

perFrag_lighting_fs +=		'uniform vec3 ambientColor;';

perFrag_lighting_fs +=		'uniform vec3 pointLightLocation;';
perFrag_lighting_fs +=		'uniform vec3 pointLightColor;';

perFrag_lighting_fs +=		'uniform sampler2D diffuse;';

perFrag_lighting_fs +=		'void main(void) {';
perFrag_lighting_fs +=			'vec3 lightWeighting;';
perFrag_lighting_fs +=			'if (!useLighting) {';
perFrag_lighting_fs +=				'lightWeighting = vec3(1.0, 1.0, 1.0);';
perFrag_lighting_fs +=			'} else {';
perFrag_lighting_fs +=				'vec3 lightDirection = normalize(pointLightLocation - vPosition.xyz);';

perFrag_lighting_fs +=				'float directionalLightWeighting = max(dot(normalize(vTransformedNormal), lightDirection), 0.0);';
perFrag_lighting_fs +=				'lightWeighting = ambientColor + pointLightColor * directionalLightWeighting;';
perFrag_lighting_fs +=			'}';

perFrag_lighting_fs +=			'vec4 fragmentColor;';
perFrag_lighting_fs +=			'if (useTextures) {';
perFrag_lighting_fs +=				'fragmentColor = texture2D(diffuse, vec2(vTextureCoord.s, vTextureCoord.t));';
perFrag_lighting_fs +=			'} else {';
perFrag_lighting_fs +=				'fragmentColor = vec4(1.0, 1.0, 1.0, 1.0);';
perFrag_lighting_fs +=			'}';
perFrag_lighting_fs +=			'gl_FragColor = vec4(fragmentColor.rgb * lightWeighting, fragmentColor.a);';
perFrag_lighting_fs +=		'}';
//------------------------------------------------------------------
//END FRAGMENT SHADERS



var POLE_gl = 	{
				models	:	[
							{
							name		:	'lion',
							type		:	'obj',
							path		:	'lionHead',
							shaders		:	{
										vs	:	perFrag_lighting_vs,
										fs	:	perFrag_lighting_fs
										},
							maps		:	['lionHead.gif'],
							position	:	[0,5,0],
							rotation	:	[90,0,0]
							
							},
							{
							name		:	'lion',
							type		:	'obj',
							path		:	'lionHead',
							shaders		:	{
										vs	:	perFrag_lighting_vs,
										fs	:	perFrag_lighting_fs
										},
							maps		:	['lionHead.gif'],
							position	:	[0,-5,0],
							rotation	:	[-90,0,0]
							}
							]
				};
				
				
				
				
//FLAGWEBGL INITIALIZE LIGHTS
//------------------------------------------------------------------
FLAGWEBGL.prototype.init_Lights = function() {

	this.lights.push(new FLAGWEBGLLIGHT({type:"ambient",color:[.1,.1,.3]}));
	this.lights.push(new FLAGWEBGLLIGHT({type:"directional",color:[.5,.5,.5],direction:[-45,45,0]}));
	this.lights.push(new FLAGWEBGLLIGHT({type:"point",color:[.5,.5,.5],position:[-50,80,-80]}));

}
//------------------------------------------------------------------
//END FLAGWEBGL INITIALIZE LIGHTS




//FLAGWEBGL INITIALIZE MODELS
//------------------------------------------------------------------
FLAGWEBGL.prototype.init_Models = function(){

	var numModels = POLE_gl.models.length;
	for(var m=0; m < numModels; m++){
		this.loadModelFile(POLE_gl.models[m]);
	}
	
}
//------------------------------------------------------------------
//END FLAGWEBGL INITIALIZE MODELS




//FLAGWEBGL LOAD MODEL FILE
//loads the model files
//------------------------------------------------------------------
FLAGWEBGL.prototype.loadModelFile = function(modelData){

	var url = modelData.path + "." + modelData.type;
	
	//load the OBJ file	
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.responseType = "text";
	request.onload = function(e){
		
		var string = e.target.response;
		//then parse the string to get a data
		switch(modelData.type){
			case "obj":
				var objData = FLAG.WebGL.parse_OBJ(string);
				break;
		}
		
		//then pass the data to create a new FLAGWEBGLMODEL
		var model = new FLAGWEBGLMODEL(objData, modelData);
		
		//model is loaded
		model.loaded = true;
		
		//add it to the list 
		FLAG.WebGL.models.push(model);
	};
	request.send();
}
//------------------------------------------------------------------
//END FLAGWEBGL LOAD MODEL FILE




//FLAGWEBGL PARSE OBJ
//turns an obj file into arrays
//------------------------------------------------------------------
FLAGWEBGL.prototype.parse_OBJ = function(str){
	
	var objData = {
		verts		:	[],
		uvs			:	[],
		norms		:	[],
		indices	:	{
					verts	:	[],
					uvs		:	[],
					norms	:	[]
					}
	};
	
	//turn double spaces into single spaces
	str = str.replace(/\s{2,}/g, ' ');
	//separates the string into lines
	var strArray = str.split("\n");
	var numLines = strArray.length;
	for(var l=0;l<numLines;l++){
			
		//separates the line by the spaces
		var lineArray = strArray[l].split(" ");
		
		//go through each item from the line
		var numItems = lineArray.length;
		for(var i=0;i<numItems;i++){
			
			//parse the vertex positions
			if(lineArray[i] == "v"){
				objData.verts.push(parseFloat(lineArray[i+1]),parseFloat(lineArray[i+2]),parseFloat(lineArray[i+3]));
			}			
			
			//parse the texture coordinates
			if(lineArray[i] == "vt"){
				objData.uvs.push(parseFloat(lineArray[i+1]),parseFloat(lineArray[i+2]));
			}
			
			//parse the normals
			if(lineArray[i] == "vn"){
				objData.norms.push(parseFloat(lineArray[i+1]),parseFloat(lineArray[i+2]),parseFloat(lineArray[i+3]));
			}
			
			//parse the indices
			if(lineArray[i] == "f"){
				
				var f1 = lineArray[i+1].split("/"),
				f2 = lineArray[i+2].split("/"),
				f3 = lineArray[i+3].split("/");
				
				//subtract 1 from all indicies to give them a 0 index base
				switch(f1.length){
					//only indices
					case 1:
						objData.indices.verts.push(parseInt(f1[0])-1,parseInt(f2[0])-1,parseInt(f3[0])-1);
						break;
					//indices and uvs
					case 2:
						objData.indices.verts.push(parseInt(f1[0])-1,parseInt(f2[0])-1,parseInt(f3[0])-1);
						objData.indices.uvs.push(parseInt(f1[1])-1,parseInt(f2[1])-1,parseInt(f3[1])-1);
						break;
					//indices, uvs and normals
					case 3:
						objData.indices.verts.push(parseInt(f1[0])-1,parseInt(f2[0])-1,parseInt(f3[0])-1);
						objData.indices.uvs.push(parseInt(f1[1])-1,parseInt(f2[1])-1,parseInt(f3[1])-1);
						objData.indices.norms.push(parseInt(f1[2])-1,parseInt(f2[2])-1,parseInt(f3[2])-1);
						break;
				}	
			}
		}
	}
	
	return objData;
}
//------------------------------------------------------------------
//END FLAGWEBGL PARSE OBJ




//FLAGWEBGL SHADER PROGRAM CREATE
//creates a shader program made up of a vertex and a fragment shader
//------------------------------------------------------------------
FLAGWEBGL.prototype.shaderProgram_create = function(vertexShader, fragmentShader, attribs, uniforms) {

	//create the shader program
	var shaderProgram = this.Context.createProgram();

	//create the vertex shader
   	var vs = this.shader_compile(vertexShader,this.Context.VERTEX_SHADER);
	//create the fragment shader
	var fs = this.shader_compile(fragmentShader,this.Context.FRAGMENT_SHADER);

    //attach the shaders to the program
    this.Context.attachShader(shaderProgram, vs);
    this.Context.attachShader(shaderProgram, fs);
    
	//link the program the canvas
    this.Context.linkProgram(shaderProgram);

	//shader errors
	if (!this.Context.getProgramParameter(shaderProgram, this.Context.LINK_STATUS)) {
		this.Context.deleteProgram(shaderProgram);
		this.Context.deleteShader(vs);
		this.Context.deleteShader(fs);
		return null;
	}

	//make some javascript properties that link to shader vars
	if(attribs) {
		shaderProgram.attribute = {};
		for(var i in attribs) {
			var attrib = attribs[i];
			shaderProgram.attribute[attrib] = this.Context.getAttribLocation(shaderProgram, attrib);
			 //tell WebGL that this property will be provided values as an array
    		this.Context.enableVertexAttribArray(shaderProgram.attribute[attrib]);
		}
	}

	if(uniforms) {
		shaderProgram.uniform = {};
		for(var i in uniforms) {
			var uniform = uniforms[i];
			shaderProgram.uniform[uniform] = this.Context.getUniformLocation(shaderProgram, uniform);
		}
	}

	return shaderProgram;
}
//------------------------------------------------------------------
//END FLAGWEBGL SHADER PROGRAM CREATE




//FLAGWEBGL SHADER COMPILE 
//translates a string into a WebGL shader
//------------------------------------------------------------------
FLAGWEBGL.prototype.shader_compile = function(str, type) {
  var shader = this.Context.createShader(type);
  this.Context.shaderSource(shader, str);
  this.Context.compileShader(shader);
  return shader;
}
//------------------------------------------------------------------
//END FLAGWEBGL SHADER COMPILE




//FLAGWEBGL TEXTURE CREATE
//passes an image file to texture compile
//------------------------------------------------------------------
FLAGWEBGL.prototype.texture_create = function(map) {	

	//make a new texture object
	var newTexture = this.Context.createTexture();
	
	//make a new image object
	newTexture.image = new Image();
	newTexture.image.onload = function(){
		FLAG.WebGL.texture_compile(newTexture);
	};	
	
	newTexture.image.src = map;
	return newTexture;	
}
//------------------------------------------------------------------
//END FLAGWEBGL TEXTURE CREATE




//FLAGWEBGL TEXTURE COMPILE 
//------------------------------------------------------------------
FLAGWEBGL.prototype.texture_compile = function(texture){

	 //tell WebGL that this is the current texture we are working with
	this.Context.bindTexture(this.Context.TEXTURE_2D, texture);
	
	//flip the image vertically for Y axis correction
	this.Context.pixelStorei(this.Context.UNPACK_FLIP_Y_WEBGL, true);
	
	//move image to texture space on graphics card
	//(what kind of image, level of detail, format stored on graphics card, format stored on graphics card, datatype for rgba, the image itself)
	this.Context.texImage2D(this.Context.TEXTURE_2D, 0, this.Context.RGBA, this.Context.RGBA, this.Context.UNSIGNED_BYTE, texture.image);
	
	//scaling parameters of the texture
	//(what kind of image, larger than image filter, type of filter)
	this.Context.texParameteri(this.Context.TEXTURE_2D, this.Context.TEXTURE_MAG_FILTER, this.Context.LINEAR);
	
	//(what kind of image, smaller than image filter, type of filter)
	this.Context.texParameteri(this.Context.TEXTURE_2D, this.Context.TEXTURE_MIN_FILTER, this.Context.LINEAR);
	
	//tell WebGL we are no longer working with any texture
    this.Context.bindTexture(this.Context.TEXTURE_2D, null);
}
//------------------------------------------------------------------
//END FLAGWEBGL TEXTURE COMPILE




//FLAGWEBGL UPDATE
//------------------------------------------------------------------
FLAGWEBGL.prototype.update = function(){
	
	//update camera postion
	this.camera.update();
	
	//update all model positions
	var numModels = this.models.length;
	for(var m=0;m<numModels;m++){
		this.models[m].update();
	}
	
	this.draw();
}
//------------------------------------------------------------------
//END FLAGWEBGL UPDATE




//FLAGWEBGL STORE VIEW
//creates and stores a copy of the model-view matrix
//so that objects and be drawn in position without changing the positon of the frame
//------------------------------------------------------------------
FLAGWEBGL.prototype.store_View = function() {
    var copy = mat4.clone(this.view_mtrx);
    this.modelView_mtrx_stack.push(copy);
}
//------------------------------------------------------------------
//END FLAGWEBGL STORE VIEW




//FLAGWEBGL RESTORE VIEW
//removes a copy of the model-view matrix from the stack
//used to reload the previous model-view matrix after objects have been drawn
//------------------------------------------------------------------
FLAGWEBGL.prototype.restore_View = function() {
    this.view_mtrx = this.modelView_mtrx_stack.pop();
}
//------------------------------------------------------------------
//END FLAGWEBGL RESTORE VIEW




//FLAGWEBGL DRAW
//renders everything to the view
//------------------------------------------------------------------
FLAGWEBGL.prototype.draw = function(){
	
	//CLEAR
	//clears the canvas
	//------------------------------------------------------------------
	this.Context.clear(this.Context.COLOR_BUFFER_BIT | this.Context.DEPTH_BUFFER_BIT);	
	
	
	//RENDER
	//draws models
	//------------------------------------------------------------------
	var numModels = this.models.length;
	for(var m=0;m<numModels;m++){	
		this.models[m].draw();
	}
	
	//FPS
	//counts frames per second
	//------------------------------------------------------------------
	var thisLoop = new Date;
    FLAG.FPS.now = Math.floor(1000 / (thisLoop - FLAG.FPS.prev));
    FLAG.FPS.prev = thisLoop;
	//calculate average FPS
	FLAG.FPS.avgA.push(FLAG.FPS.now);
	if(FLAG.FPS.avgA.length > 60){
		FLAG.FPS.avgA.shift();
	}
	var lengthOfAvg = FLAG.FPS.avgA.length;
	var totalAvgFPS = 0;
	for(var i=0;i<lengthOfAvg;i++){
		totalAvgFPS += FLAG.FPS.avgA[i];
	}
	FLAG.FPS.avg = Math.floor(totalAvgFPS/lengthOfAvg);
}
//------------------------------------------------------------------
//END FLAGWEBGL DRAW





//FLAGWEBGLMODEL
//------------------------------------------------------------------
//------------------------------------------------------------------


//FLAGWEBGLMODEL CONSTRUCTOR
//------------------------------------------------------------------
function FLAGWEBGLMODEL(objData, modelData){
	
	//PROPERTIES
	//------------------------------------------------------------------
	this.buffers = {
		vertex			:	null,
		uvs				:	null,
		norms			:	null,
		index			:	null
	};	
	
	
	//BUFFERS
	//loads buffers into memory for model
	//------------------------------------------------------------------
	//VERTICES
	//holds all the vertex positions
	//------------------------------------------------------------------
	this.buffers.vertex = FLAG.WebGL.Context.createBuffer();
	FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.vertex);
	FLAG.WebGL.Context.bufferData(FLAG.WebGL.Context.ARRAY_BUFFER, new Float32Array(objData.verts), FLAG.WebGL.Context.STATIC_DRAW);
	
	//NORMALS
	//holds direction a surface is facing
	//------------------------------------------------------------------
	this.buffers.norms = FLAG.WebGL.Context.createBuffer();	
	FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.norms);
	FLAG.WebGL.Context.bufferData(FLAG.WebGL.Context.ARRAY_BUFFER, new Float32Array(objData.norms), FLAG.WebGL.Context.STATIC_DRAW);
	
	//UVS
	//holds the x and y texture coordinates
	//------------------------------------------------------------------
	this.buffers.uvs = FLAG.WebGL.Context.createBuffer();
	FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.uvs);
	FLAG.WebGL.Context.bufferData(FLAG.WebGL.Context.ARRAY_BUFFER, new Float32Array(objData.uvs), FLAG.WebGL.Context.STATIC_DRAW);	
	
	//INDEX
	//holds indices of the the verts that make faces, used by the renderer, faster than rendering every vertex
	//------------------------------------------------------------------
	this.buffers.index = FLAG.WebGL.Context.createBuffer();
	FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ELEMENT_ARRAY_BUFFER, this.buffers.index);	
	FLAG.WebGL.Context.bufferData(FLAG.WebGL.Context.ELEMENT_ARRAY_BUFFER, new Uint16Array(objData.indices.verts), FLAG.WebGL.Context.STATIC_DRAW);
	
	this.indexCount = objData.indices.verts.length;	
	this.loaded = false;
	this.name = modelData.name;
	this.position = vec3.create();									//position vector
	this.position[0] = modelData.position[0];						//x	
	this.position[1] = modelData.position[1];						//y
	this.position[2] = modelData.position[2];						//z						
	this.rotation = vec3.create();									//rotation vector
	this.rotation[0] = modelData.rotation[0];						//x	
	this.rotation[1] = modelData.rotation[1];						//y
	this.rotation[2] = modelData.rotation[2];						//z	
	this.texture = FLAG.WebGL.texture_create(modelData.maps[0]);
	this.useLighting = true;
	
	
	this.shader = FLAG.WebGL.shaderProgram_create(modelData.shaders.vs, modelData.shaders.fs,
	
	/*
	//attributes
	["vertexPosition","textureCoord"],
	//uniforms
	["view_mtrx","projection_mtrx","diffuse"]);
	*/
	
	
	//attributes
	["vertexPosition","vertexNormal","textureCoord"],
	//uniforms
	["view_mtrx","projection_mtrx","normal_mtrx","diffuse","useLighting","ambientColor","lightingDirection","directionalColor","useTextures","pointLightLocation","pointLightColor"]);
	
		
	//------------------------------------------------------------------
	//END PROPERTIES	
}
//------------------------------------------------------------------
//END FLAGWEBGLMODEL CONSTRUCTOR




//FLAGWEBGLMODEL UPDATE
//updates a model
//------------------------------------------------------------------
FLAGWEBGLMODEL.prototype.update = function(){
	
	//this.position[2] -= .1;
	//this.rotation[2] -= .1;

}
//------------------------------------------------------------------
//END FLAGWEBGLMODEL UPDATE	




//FLAGWEBGLMODEL DRAW
//draws a model
//------------------------------------------------------------------
FLAGWEBGLMODEL.prototype.draw = function(){
	
	if(this.loaded == true){
	
		//STORE
		//hold the current state of the view matrix
		//------------------------------------------------------------------
		FLAG.WebGL.store_View();	
		
		//TRANSLATE
		//move the view matrix to the model
		//------------------------------------------------------------------
		mat4.translate(FLAG.WebGL.view_mtrx, FLAG.WebGL.view_mtrx, this.position);
		
		//ROTATE
		//rotate the view matrix to the model
		//------------------------------------------------------------------
		mat4.rotate(FLAG.WebGL.view_mtrx, FLAG.WebGL.view_mtrx, FLAG.degToRad(this.rotation[0]), [1, 0, 0]);	
		mat4.rotate(FLAG.WebGL.view_mtrx, FLAG.WebGL.view_mtrx, FLAG.degToRad(this.rotation[1]), [0, 1, 0]);	
		mat4.rotate(FLAG.WebGL.view_mtrx, FLAG.WebGL.view_mtrx, FLAG.degToRad(this.rotation[2]), [0, 0, 1]);	
	
		//SHADER
		//------------------------------------------------------------------
		FLAG.WebGL.Context.useProgram(this.shader);        

		//BUFFERS
		//bind buffers to shader attributes
		//------------------------------------------------------------------
		//vertex
		FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.vertex);
        FLAG.WebGL.Context.vertexAttribPointer(this.shader.attribute.vertexPosition, 3, FLAG.WebGL.Context.FLOAT, false, 12, 0);
        //normals
      	FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.norms);
        FLAG.WebGL.Context.vertexAttribPointer(this.shader.attribute.vertexNormal, 3, FLAG.WebGL.Context.FLOAT, false, 12, 0);
		//texture
        FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ARRAY_BUFFER, this.buffers.uvs);
        FLAG.WebGL.Context.vertexAttribPointer(this.shader.attribute.textureCoord, 2, FLAG.WebGL.Context.FLOAT, false, 8, 0);
		
		//TEXTURES
		//bind texture to shader uniforms
		//------------------------------------------------------------------
        FLAG.WebGL.Context.activeTexture(FLAG.WebGL.Context.TEXTURE0);
        FLAG.WebGL.Context.bindTexture(FLAG.WebGL.Context.TEXTURE_2D, this.texture);
        FLAG.WebGL.Context.uniform1i(this.shader.uniform.diffuse, 0);
         //using textures
		FLAG.WebGL.Context.uniform1i(this.shader.uniform.useTextures, true); 
        //using lighting
		FLAG.WebGL.Context.uniform1i(this.shader.uniform.useLighting, this.useLighting);   		
	
		//LIGHTS
		//bind lights to shader uniforms
		//------------------------------------------------------------------
		if(this.useLighting == true){
	
			var numLights = FLAG.WebGL.lights.length;
			for(var l=0;l<numLights;l++){
		
				//set uniform vars of shader based on type:
				switch(FLAG.WebGL.lights[l].type){
					case "ambient":
						//color
						FLAG.WebGL.Context.uniform3f(
							this.shader.uniform.ambientColor,
							parseFloat(FLAG.WebGL.lights[l].color[0]),	//red
							parseFloat(FLAG.WebGL.lights[l].color[1]),	//green
							parseFloat(FLAG.WebGL.lights[l].color[2])	//blue
						);
						break;
					case "directional":
						//direction
						var lightingDirection = [
							parseFloat(FLAG.WebGL.lights[l].direction[0]),	//x
							parseFloat(FLAG.WebGL.lights[l].direction[1]),	//y
							parseFloat(FLAG.WebGL.lights[l].direction[2])	//z
						];
						var adjustedLD = vec3.create();
						vec3.normalize(lightingDirection, adjustedLD);
						vec3.scale(adjustedLD, -1);
						FLAG.WebGL.Context.uniform3fv(this.shader.uniform.lightingDirection, adjustedLD);
					
						//color
						FLAG.WebGL.Context.uniform3f(
							this.shader.uniform.directionalColor,
							parseFloat(FLAG.WebGL.lights[l].color[0]),	//red
							parseFloat(FLAG.WebGL.lights[l].color[1]),	//green
							parseFloat(FLAG.WebGL.lights[l].color[2])	//blue
						);
						break;
					case "point":
						//location
						var lightingLocation = [
							parseFloat(FLAG.WebGL.lights[l].position[0]),	//x
							parseFloat(FLAG.WebGL.lights[l].position[1]),	//y
							parseFloat(FLAG.WebGL.lights[l].position[2])	//z
						];
						FLAG.WebGL.Context.uniform3fv(this.shader.uniform.pointLightLocation, lightingLocation);
						
						//color
						FLAG.WebGL.Context.uniform3f(
							this.shader.uniform.pointLightColor,
							parseFloat(FLAG.WebGL.lights[l].color[0]),	//red
							parseFloat(FLAG.WebGL.lights[l].color[1]),	//green
							parseFloat(FLAG.WebGL.lights[l].color[2])	//blue
						);
						break;
				}
			}
		}

        //TRANSFORM MATRIXES
        //get all matrixes facing the right direction for rendering
		//------------------------------------------------------------------
		//view
        FLAG.WebGL.Context.uniformMatrix4fv(this.shader.uniform.view_mtrx, false, FLAG.WebGL.view_mtrx);  
		//projection
        FLAG.WebGL.Context.uniformMatrix4fv(this.shader.uniform.projection_mtrx, false, FLAG.WebGL.projection_mtrx);
        //normals
        var normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, FLAG.WebGL.view_mtrx);
        FLAG.WebGL.Context.uniformMatrix3fv(this.shader.uniform.normal_mtrx, false, normalMatrix);

		//RENDER
		//draw the model
		//------------------------------------------------------------------
		//use the index buffer for rendering
		FLAG.WebGL.Context.bindBuffer(FLAG.WebGL.Context.ELEMENT_ARRAY_BUFFER, this.buffers.index);
		//draw the array of vertices, given as triangles, starting with 0 index through the amount of items in the elements buffer
		FLAG.WebGL.Context.drawElements(FLAG.WebGL.Context.TRIANGLES, this.indexCount, FLAG.WebGL.Context.UNSIGNED_SHORT, 0);
		
		//RESTORE THE VIEW
		//restore the state of the model-view matrix after it was move around to render individual objects to the frame
		//------------------------------------------------------------------
		FLAG.WebGL.restore_View();
		
	}
}
//------------------------------------------------------------------
//END FLAGWEBGLMODEL DRAW

//------------------------------------------------------------------
//------------------------------------------------------------------
//END FLAGWEBGLMODEL




//FLAGWEBGLCAMERA
//------------------------------------------------------------------
//------------------------------------------------------------------

//FLAGWEBGLCAMERA CONSTRUCTOR
//------------------------------------------------------------------
function FLAGWEBGLCAMERA(canvas, view_mtrx, projection_mtrx){
	
	this.cam_mtrx = mat4.create();
	this.position = vec3.create();					//position vector
	this.rotation = vec3.create();					//rotation vector
	this.projection = 	{
						type	:	"perspective",		//perspective or ortho
						fov		:	45,					//vertical field of view in degrees
						cull	:	{near:0.1,far:150}	//when to stop drawing models
						};

	this.set_projection(canvas, view_mtrx, projection_mtrx); //initialize the camera's projection attributes
}
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA CONSTRUCTOR




//FLAGWEBGLCAMERA SET PROJECTION
//sets the projection attributes of the camera
//------------------------------------------------------------------
FLAGWEBGLCAMERA.prototype.set_projection = function(canvas, view_mtrx, projection_mtrx){
	
	switch(this.projection.type){
		//orthographic
		case "ortho":
			mat4.ortho(projection_mtrx, 0, canvas.width, canvas.height, 0, this.projection.cull.near, this.projection.cull.far);
			break;
		//perspective
		default:
			//(projection matrix, vertical field of view in degrees, width to height ratio of canvas, hide this close to the viewport, hide this far from the viewport)
			mat4.perspective(projection_mtrx, this.projection.fov, canvas.width / canvas.height, this.projection.cull.near, this.projection.cull.far);
			break;
	}
}
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA SET PROJECTION



FLAGWEBGLCAMERA.prototype.update = function(){	
	//this.rotation[1] += 1;
	//this.orbit([0,0,0], 20);
}

FLAGWEBGLCAMERA.prototype.fly = function(){

	//move and rotate the camera at the same time
}



//FLAGWEBGLCAMERA ORBIT
//x and y rotation around a point at a distance
//------------------------------------------------------------------
FLAGWEBGLCAMERA.prototype.orbit = function(point, distance){
	
	//fresh matrixes
	var new_cam_mtrx = mat4.create();
	var new_cam_pos = vec3.create();
	var new_cam_rot = vec3.create();
	
	//move it to the center of the orbit
	mat4.translate(new_cam_mtrx, new_cam_mtrx, point);
	//update position vector
	vec3.add(new_cam_pos, new_cam_pos, point);
	
	//do the rotation
	mat4.rotateX(new_cam_mtrx, new_cam_mtrx, FLAG.degToRad(this.rotation[0]));
	mat4.rotateY(new_cam_mtrx, new_cam_mtrx, FLAG.degToRad(this.rotation[1]));	
	
	//push back from the center of the orbit
	var pushBack = vec3.create();
	pushBack[2] = distance;
	mat4.translate(new_cam_mtrx, new_cam_mtrx, pushBack);
	//update position vector
	vec3.add(new_cam_pos, new_cam_pos, pushBack);
	
	//copy the new mtrx to the camera's matrix
	mat4.copy(this.cam_mtrx, new_cam_mtrx);
	//flip camera matrix for the view_mtrx
	mat4.invert(FLAG.WebGL.view_mtrx, this.cam_mtrx);
}
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA ORBIT




//FLAGWEBGLCAMERA MOVE
//translates the position of the view
//------------------------------------------------------------------
FLAGWEBGLCAMERA.prototype.move = function(move){
	
	var moveBy = vec3.create();
	
	//if move is an array
	if( Object.prototype.toString.call( move ) === '[object Array]' ) {
	
		switch(move.length){
			case 1:
				moveBy[0] = move[0];
				break;
			case 2:
				moveBy[0] = move[0];
				moveBy[1] = move[1];
				break;
			case 3:
				moveBy[0] = move[0];
				moveBy[1] = move[1];
				moveBy[2] = move[2];
				break;
		}
    	
    //if move is an object	
	}else if(typeof move === "object"){
		
		if(move.hasOwnProperty('x')){moveBy[0] = move.x;};
		if(move.hasOwnProperty('y')){moveBy[1] = move.y;};
		if(move.hasOwnProperty('z')){moveBy[2] = move.z;};
	};
		
	//move the camera matrix
	mat4.translate(this.cam_mtrx, this.cam_mtrx, moveBy);
	//flip camera matrix for the view_mtrx
	mat4.invert(FLAG.WebGL.view_mtrx, this.cam_mtrx);
	//update position vector
	vec3.add(this.position, this.position, moveBy);
}
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA MOVE




//FLAGWEBGLCAMERA ROTATE
//rotates the position of the view
//------------------------------------------------------------------
FLAGWEBGLCAMERA.prototype.rotate = function(rotate){
	
	var rotateBy = vec3.create();
	
	//if rotate is an array
	if( Object.prototype.toString.call( rotate ) === '[object Array]' ) {
	
		switch(rotate.length){
			case 1:
				rotateBy[0] = rotate[0];
				break;
			case 2:
				rotateBy[0] = rotate[0];
				rotateBy[1] = rotate[1];
				break;
			case 3:
				rotateBy[0] = rotate[0];
				rotateBy[1] = rotate[1];
				rotateBy[2] = rotate[2];
				break;
		}
    	
    //if rotate is an object	
	}else if(typeof rotate === "object"){
		
		if(rotate.hasOwnProperty('x')){rotateBy[0] = rotate.x;};
		if(rotate.hasOwnProperty('y')){rotateBy[1]= rotate.y;};
		if(rotate.hasOwnProperty('z')){rotateBy[2]= rotate.z;};
	};

	//rotate the camera
	mat4.rotate(this.cam_mtrx, this.cam_mtrx, FLAG.degToRad(rotateBy[0]), [1, 0, 0]);	
	mat4.rotate(this.cam_mtrx, this.cam_mtrx, FLAG.degToRad(rotateBy[1]), [0, 1, 0]);	
	mat4.rotate(this.cam_mtrx, this.cam_mtrx, FLAG.degToRad(rotateBy[2]), [0, 0, 1]);	
	//update rotation vector
	vec3.add(this.rotation, this.rotation, rotateBy);
	
	//flip it for the view_mtrx
	mat4.invert(FLAG.WebGL.view_mtrx, this.cam_mtrx);
	
}
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA ROTATE

//------------------------------------------------------------------
//------------------------------------------------------------------
//END FLAGWEBGLCAMERA




//FLAGWEBGLLIGHT
//------------------------------------------------------------------
//------------------------------------------------------------------

//FLAGWEBGLLIGHT CONSTRUCTOR
//------------------------------------------------------------------
function FLAGWEBGLLIGHT(lightData){
	
	//TYPE
	//ambient, directional or point
	if(lightData.type != undefined){this.type = lightData.type;}else{this.type="ambient";};
	
	//DIRECTION
	//x,y,z
	if(lightData.direction != undefined){this.direction = lightData.direction;}else{this.direction=[-.25,-.25,-1];};
	
	//POSITION
	//x,y,z
	if(lightData.position != undefined){this.position = lightData.position;}else{this.position=[0,0,0];};
	
	//COLOR
	//r,g,b
	if(lightData.color != undefined){this.color = lightData.color;}else{this.color=[.2,.2,.2];};
}
//------------------------------------------------------------------
//END FLAGWEBGLLIGHT CONSTRUCTOR

//------------------------------------------------------------------
//------------------------------------------------------------------
//END FLAGWEBGLLIGHT CONSTRUCTOR





//DEGREES TO RADIANS
//changes degrees to radians
//------------------------------------------------------------------
FLAGENGINE.prototype.degToRad = function(degrees) {
    return degrees * Math.PI / 180;
}
//------------------------------------------------------------------
//END DEGREES TO RADIANS

//------------------------------------------------------------------
//------------------------------------------------------------------
//END FLAGWEBGL

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGENGINE 



//FLAGACTOR 
//Constructor for the FLAGACTOR class 
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGACTOR(pIndex,instanceName,position,layer){
	//PROPERTIES
	this.bodies = [];
	this.joints = [];
	this.layer = layer;
	this.name = instanceName;
	this.pIndex = pIndex;
	this.position = {x:position.x,y:position.y};
	this.update = null;
	return this;
}

FLAGACTOR.prototype.addDecal = function(p){
	var decalFound = false;
	if(!p.hasOwnProperty('decal')){
		//do nothing, no decal was given
	}else{
		//if the decal is a name
		if(isNaN(p.decal) == true){
			//find the number that matches the name in the spriteSheets
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			for(var d=0;d<numSpriteSheets;d++){
				if(p.decal == FLAG.Scene.spriteSheets[d].name){
					p.decal = d;
					decalFound = true;
				}
			}
		//if the decal is given as a number
		}else{
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			if(p.decal < numSpriteSheets){
				decalFound = true;
			}
		}
	}
	
	if(decalFound == true){
		var numDecals = this.bodies[0].Sprite.decals.length;
		if(!p.hasOwnProperty('decalName')){p.decalName = "Decal_"+numDecals;};
		if(!p.hasOwnProperty('x')){p.x = 0;};
		if(!p.hasOwnProperty('y')){p.y = 0;};
		if(!p.hasOwnProperty('playing')){p.playing = true;};
		if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
		if(!p.hasOwnProperty('gui')){p.gui = false;};
		if(!p.hasOwnProperty('front')){p.front = true;};
		
		if(!p.hasOwnProperty('animation')){
			p.animation = null;
		}else{
			var animationFound = false;
			//if the animation is given as a name
			if(isNaN(p.animation) == true){
				//find the number that matches the name in the sprites
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				for(var a=0;a<numAnimations;a++){
					if(p.animation == FLAG.Scene.spriteSheets[p.decal].animations[a].name){
						p.animation = a;
						animationFound = true;
					}
				}
			//if the animation is given as a number
			}else{
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				if(p.animation < numAnimations){
					animationFound = true;
				}
			}
			if(animationFound != true){
				p.animation = null;
			}
		}
		
		if(!p.hasOwnProperty('frame')){
			p.frame = 0;
		}else{
			var frameExists = false;
			//if an animation exists
			if(p.animation != null){
				//if the frame is given as a name
				if(isNaN(p.frame) == true){
					if(p.frame == "startFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].startFrame);
						frameExists = true;
					}else if(p.frame == "endFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				//if frame is given as number
				}else{
					if(p.frame > Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame)){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				}
			//if no animation exists
			}else{
				//does frame exist
				if(p.frame < (FLAG.Scene.spriteSheets[p.decal].tilesWide * FLAG.Scene.spriteSheets[p.decal].tilesHigh)){
					frameExists = true;
				}
			}
			if(frameExists != true){
				p.frame = 0;
			}
		}
		
		this.bodies[0].Sprite.decals.push(new FLAGSPRITE(p.decalName,p.decal,p.x,p.y,p.frame,p.animation,this.layer,p.playing,p.alpha,p.gui,p.front));	
	}
}

FLAGACTOR.prototype.applyForce = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('atX')){p.atX = this.bodies[0].fb2Body.GetPosition().x;};
	if(!p.hasOwnProperty('atY')){p.atY = this.bodies[0].fb2Body.GetPosition().y;};
	var numBodies = this.bodies.length;
	for(var j=0;j<numBodies;j++){
		var b = this.bodies[j].fb2Body;
		p.atX = this.bodies[j].fb2Body.GetPosition().x;
		p.atY = this.bodies[j].fb2Body.GetPosition().y;
		b.ApplyForce(new b2Vec2(p.x,p.y), new b2Vec2(p.atX,p.atY));
	}
}

FLAGACTOR.prototype.applyImpulse = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('atX')){p.atX = this.bodies[0].fb2Body.GetPosition().x;};
	if(!p.hasOwnProperty('atY')){p.atY = this.bodies[0].fb2Body.GetPosition().y;};
	var numBodies = this.bodies.length;
	for(var j=0;j<numBodies;j++){
		var b = this.bodies[j].fb2Body;
		p.atX = this.bodies[j].fb2Body.GetPosition().x;
		p.atY = this.bodies[j].fb2Body.GetPosition().y;
		b.ApplyImpulse(new b2Vec2(p.x,p.y), new b2Vec2(p.atX,p.atY));
	}
}

FLAGACTOR.prototype.applyTorque = function(torque){
	var torque = torque || 0;
	var numBodies = this.bodies.length;
	for(var j=0;j<numBodies;j++){
		var b = this.bodies[j].fb2Body;
		b.ApplyTorque(torque);
	}
}

FLAGACTOR.prototype.Body = function(name){
	var numBodies = this.bodies.length;
	//if given as string
	if(isNaN(name) == true){
		for(var b=0;b<numBodies;b++){
			if(this.bodies[b].name == name){
				return this.bodies[b];
			}
		}
	//if given as Number
	}else{
		return this.bodies[name];
	}
}

FLAGACTOR.prototype.cameraFollow = function(hideEdge){
	var limit = {};
	var limitAmount = hideEdge || 0;
		
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		limit.x_low = FLAG.Canvas.width - FLAG.Scene.Map.w + limitAmount;
		limit.x_high = 0-limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}else if(FLAG.Scene.Map.type == "isometric"){
		limit.x_low = FLAG.Canvas.width - (FLAG.Scene.Map.w/2) + limitAmount;
		limit.x_high = (FLAG.Scene.Map.w/2) - limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}
		
	//target destination of camera
	var destination = {x:Math.round((FLAG.center.x) - (this.bodies[0].fb2Body.GetPosition().x*FLAG.Box2D.scale)),y:Math.round((FLAG.center.y) - (this.bodies[0].fb2Body.GetPosition().y*FLAG.Box2D.scale))};

	if(FLAG.Canvas.width < FLAG.Scene.Map.w){
		//LIMITS
		if(limit.x_low != null){
			if(destination.x < limit.x_low ){
				destination.x = limit.x_low;
			}
		}

		if(limit.x_high != null){
			if(destination.x > limit.x_high ){
				destination.x = limit.x_high;
			}
		}			
	}else{
		if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
			destination.x = FLAG.center.x - (FLAG.Scene.Map.w/2);					
		}else if(FLAG.Scene.Map.type == "isometric"){
			destination.x = FLAG.center.x;
		}
	}

	if(FLAG.Canvas.height < FLAG.Scene.Map.h){
		//LIMITS
		if(limit.y_low != null){
			if(destination.y < limit.y_low ){
				destination.y = limit.y_low;
			}
		}

		if(limit.y_high != null){
			if(destination.y > limit.y_high ){
				destination.y = limit.y_high;
			}
		}	
	}else{
		destination.y = FLAG.center.y - (FLAG.Scene.Map.h/2);					
	}

	//move camera
	FLAG.Scene.Map.x = Math.round(FLAG.Scene.Map.x + (destination.x - FLAG.Scene.Map.x));
	FLAG.Scene.Map.y = Math.round(FLAG.Scene.Map.y + (destination.y - FLAG.Scene.Map.y));		
}

FLAGACTOR.prototype.clicked = function(){
	//check for the Actor's name in the returned list
	var actors = FLAG.actorsClicked();
	var numActors = actors.length;
	var actorClicked = false;
	for(var a=0;a<numActors;a++){
		if(this.name == actors[a].name){
			actorClicked = true;
		}
	}
	
	return actorClicked;
}

FLAGACTOR.prototype.clickedDecal = function(decal){
	//an array to hold the names of the sprites clicked
	var clickedDecals = [];
	//get the mouse position
	var clickPoint = {x:FLAG.Pointer.mapLoc.x, y:FLAG.Pointer.mapLoc.y};
	var decalFound = false;
	var whichBody = null;
	if(decal == null){
		//do nothing, no decal was given
	}else{
		//if the decal is given as a name
		if(isNaN(decal) == true){
			//find the name of the decal
			var numBodies = this.bodies.length;
			for(var j=0;j<numBodies;j++){
				var numDecals = this.bodies[j].Sprite.decals.length;
				for(var d=0;d<numDecals;d++){
					if(this.bodies[j].Sprite.decals[d].name == decal){
						decal = s;
						whichBody = j;
						decalFound = true;
					}
				}
			}
		//decal given as number
		}else{
			var numBodies = this.bodies.length;
			for(var j=0;j<numBodies;j++){
				var numDecals = this.bodies[j].Sprite.decals.length;
				if(decal < numDecals){
					whichBody = j;
					decalFound = true;
				}
			}
		}
	}
	
	if(decalFound == true){
		var theDecal = this.bodies[whichBody].Sprite.decals[decal];
		//get the position of the decal
		var decalRect = FLAG.Scene.spriteSheets[theDecal.pIndex].tileRects[theDecal.frame];
		var decalPoint = {x:(this.bodies[whichBody].fb2Body.GetPosition().x*FLAG.Box2D.scale)+(theDecal.x), y:(this.bodies[whichBody].fb2Body.GetPosition().y*FLAG.Box2D.scale)+(theDecal.y)};
		
		//set up the rect to check
		var checkRect = {x:0,y:0,w:0,h:0};
		checkRect.x = decalPoint.x - ((decalRect.w/2)*FLAG.scale);
		checkRect.y = decalPoint.y - ((decalRect.h/2)*FLAG.scale);
		checkRect.w = decalRect.w*FLAG.scale;
		checkRect.h = decalRect.h*FLAG.scale;
		
		if(FLAG.pointInRect(clickPoint,checkRect) == true){
			clickedDecals.push(theDecal.name);
		}
	}
	if(clickedDecals.length > 0){
		return true;
	}else{
		return false;
	}
}

FLAGACTOR.prototype.Decal = function(instanceName){
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		var numDecals = this.bodies[b].Sprite.decals.length;
		for(var d=0;d<numDecals;d++){
			if(this.bodies[b].Sprite.decals[d].name == instanceName){
				return this.bodies[b].Sprite.decals[d];
			}	
		}
	}
}

FLAGACTOR.prototype.destroy = function(){
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		this.bodies[b].name = "destroy";
	}
}

FLAGACTOR.prototype.drag = function(){
	var x = FLAG.Pointer.mapLoc.x/FLAG.Box2D.scale;
	var y = FLAG.Pointer.mapLoc.y/FLAG.Box2D.scale;
	
	var numBodies = this.bodies.length;
	var offsets = [];
	for(var b=0;b<numBodies;b++){
		//store the offset of each body from body 0
		var posOffset = {x:0,y:0};
		posOffset.x = this.bodies[0].fb2Body.GetPosition().x - this.bodies[b].fb2Body.GetPosition().x;
		posOffset.y = this.bodies[0].fb2Body.GetPosition().y - this.bodies[b].fb2Body.GetPosition().y;
		offsets.push(posOffset);
	}
	
	//apply position change to all bodies based on body 0
	for(var b=0;b<numBodies;b++){
		this.bodies[b].fb2Body.SetAwake(false);
		this.bodies[b].fb2Body.SetPosition({x:x-offsets[b].x,y:y-offsets[b].y});
	}
}

FLAGACTOR.prototype.getAngle = function(){
	return this.bodies[0].fb2Body.GetAngle() * (180/Math.PI);
}

FLAGACTOR.prototype.getAngularVelocity = function(){
	return this.bodies[0].fb2Body.GetAngularVelocity();
}

FLAGACTOR.prototype.getAnimation = function(){
	return {index:this.bodies[0].Sprite.animation,name:FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations[this.bodies[0].Sprite.animation].name};
}

FLAGACTOR.prototype.getInertia = function(){
	return this.bodies[0].fb2Body.GetInertia();
}

FLAGACTOR.prototype.getLinearVelocity = function(){
	return this.bodies[0].fb2Body.GetLinearVelocity();
}

FLAGACTOR.prototype.getMass = function(){
	return this.bodies[0].fb2Body.GetMass();
}

FLAGACTOR.prototype.getPosition = function(){
	var pos = this.bodies[0].fb2Body.GetPosition();
	var pixelPos = {x:0,y:0};
	pixelPos.x = pos.x * FLAG.Box2D.scale;
	pixelPos.y = pos.y * FLAG.Box2D.scale;
	return pixelPos;
}

FLAGACTOR.prototype.isometricMove = function(speed){
	var speed = speed || 0;
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		if(FLAG.arrowUp == true && FLAG.arrowRight == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,0));
		}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,-speed));
		}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,speed));
		}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,0));
		}else{
			if(FLAG.arrowUp == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,-speed*.5));
			}
			if(FLAG.arrowDown== true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,speed*.5));
			}
			if(FLAG.arrowRight == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,speed*.5));
			}
			if(FLAG.arrowLeft == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,-speed*.5));
			}
		}
		if(FLAG.arrowLeft == false && FLAG.arrowRight == false && FLAG.arrowDown== false && FLAG.arrowUp == false){
			this.bodies[b].fb2Body.SetAwake(false);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,0));
		}
	}
}

FLAGACTOR.prototype.Joint = function(name){
	var numJoints = this.joints.length;
	for(var j=0;j<numJoints;j++){
		if(this.joints[j].name == name){
			return this.joints[j];
		}
	}
}

FLAGACTOR.prototype.linearMove = function(speed){
	var speed = speed || 0;
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		if(FLAG.arrowUp == true && FLAG.arrowRight == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,-speed*.5));
		}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,-speed*.5));
		}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,speed*.5));
		}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
			this.bodies[b].fb2Body.SetAwake(true);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,speed*.5));
		}else{
			if(FLAG.arrowUp == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,-speed));
			}
			if(FLAG.arrowDown== true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,speed));
			}
			if(FLAG.arrowRight == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(speed,0));
			}
			if(FLAG.arrowLeft == true){
				this.bodies[b].fb2Body.SetAwake(true);
				this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(-speed,0));
			}
		}
		if(FLAG.arrowLeft == false && FLAG.arrowRight == false && FLAG.arrowDown== false && FLAG.arrowUp == false){
			this.bodies[b].fb2Body.SetAwake(false);
			this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(0,0));
		}
	}
}

FLAGACTOR.prototype.play = function(){
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		this.bodies[b].Sprite.playing = true;
	}
}

FLAGACTOR.prototype.Sprite = function(){
	return this.bodies[0].Sprite;
}

FLAGACTOR.prototype.removeDecal = function(decal){
	if(decal == null){
		//do nothing, no decal name given
	}else{
		var numBodies = this.bodies.length;
		for(var b=0;b<numBodies;b++){
			var decalsToKeep = [];
			//if the decal is given as a name
			if(isNaN(decal) == true){
				//find the name of the decal
				var numDecals = this.bodies[b].Sprite.decals.length;
				for(var d=0;d<numDecals;d++){
					if(this.bodies[b].Sprite.decals[d].name != decal){
						decalsToKeep.push(this.bodies[b].Sprite.decals[d]);
					}
				}
			//decal given as number
			}else{
				var numDecals = this.bodies[b].Sprite.decals.length;
				for(var d=0;d<numDecals;d++){
					if(d != decal){
						decalsToKeep.push(this.bodies[b].Sprite.decals[d]);
					}
				}
			}
			
			this.bodies[b].Sprite.decals = [];
			this.bodies[b].Sprite.decals = decalsToKeep;
		}
	}
}

FLAGACTOR.prototype.setAngle = function(angle){
	this.bodies[0].fb2Body.SetAngle(angle * (Math.PI/180));
}

FLAGACTOR.prototype.setAnimation = function(animation){
	var animationFound = -1;
	//if given as name
	if(isNaN(animation) == true){
		//find the number that matches the name in the actorSheet
		var numAnimations = FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			if(animation == FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations[a].name){
				animationFound = a;
				break;
			}
		}
	//given as a number
	}else{
		var numAnimations = FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations.length;
		if(animation < numAnimations){
			animationFound = animation;
		}
	}
	
	if(animationFound != -1 && this.bodies[0].Sprite.animation != animationFound){
		this.bodies[0].Sprite.frame = FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations[animationFound].startFrame;
		this.bodies[0].Sprite.animation = animationFound;
	}
}

FLAGACTOR.prototype.setAwake = function(awake){
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		this.bodies[b].fb2Body.SetAwake(awake);
	}
}

FLAGACTOR.prototype.setFrame = function(frame){
	var fameFound = false;
	//if given as name
	if(isNaN(frame) == true && this.bodies[0].animation != null){
		if(frame == "startFrame"){
			frame = FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations[this.bodies[0].Sprite.animation].startFrame;
			fameFound = true;
		}else if(value == "endFrame"){
			frame = FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].animations[this.bodies[0].Sprite.animation].endFrame;
			fameFound = true;
		}
	//if given as number
	}else{
		if(frame < (FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].tilesWide * FLAG.Scene.spriteSheets[this.bodies[0].Sprite.pIndex].tilesHigh)){
			fameFound = true;
		}
	}
	
	if(fameFound == true){
		this.bodies[0].frame = frame;
	}
}

FLAGACTOR.prototype.setLinearVelocity = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		var adjustedVelocity = {x:0,y:0};
		if(p.x == 0){
			adjustedVelocity.x = this.bodies[b].fb2Body.GetLinearVelocity().x;
		}else{
			adjustedVelocity.x = p.x;
		}
		if(p.y == 0){
			adjustedVelocity.y = this.bodies[b].fb2Body.GetLinearVelocity().y;
		}else{
			adjustedVelocity.y = p.y;
		}
		this.bodies[b].fb2Body.SetAwake(true);
		this.bodies[b].fb2Body.SetLinearVelocity(new b2Vec2(adjustedVelocity.x,adjustedVelocity.y));
	}
}

FLAGACTOR.prototype.setPosition = function(p){
	if(!p.hasOwnProperty('x')){p.x = this.bodies[0].fb2Body.GetPosition().x;}else{p.x = p.x/FLAG.Box2D.scale;};
	if(!p.hasOwnProperty('y')){p.y = this.bodies[0].fb2Body.GetPosition().y;}else{p.y = p.y/FLAG.Box2D.scale;};
	var numBodies = this.bodies.length;
	var offsets = [];
	for(var b=0;b<numBodies;b++){
		//store the offset of each body from body 0
		var posOffset = {x:0,y:0};
		posOffset.x = this.bodies[0].fb2Body.GetPosition().x - this.bodies[b].fb2Body.GetPosition().x;
		posOffset.y = this.bodies[0].fb2Body.GetPosition().y - this.bodies[b].fb2Body.GetPosition().y;
		offsets.push(posOffset);
	}
	//apply position change to all bodies based on body 0
	for(var b=0;b<numBodies;b++){
		this.bodies[b].fb2Body.SetPosition(new b2Vec2(p.x-offsets[b].x,p.y-offsets[b].y));
	}
}

FLAGACTOR.prototype.stop = function(){
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		this.bodies[b].Sprite.playing = false;
	}
}

FLAGACTOR.prototype.tilePath  = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.bodies[0].tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.bodies[0].tileOn.col;};
	if(!p.hasOwnProperty('timeStep')){p.timeStep = 1;};
	if(!p.hasOwnProperty('diagonals')){p.diagonals = false;};
	p.end = {row:p.row,col:p.col};

	var start = {row:this.bodies[0].tileOn.row, col:this.bodies[0].tileOn.col};
	var end = p.end;
	var timeStep = p.timeStep;
	if(end.row < FLAG.Scene.Map.tilesHigh && end.col < FLAG.Scene.Map.tilesWide && end.row >= 0 && end.col >= 0 && FLAG.Scene.walkableTiles[end.row][end.col] != 0){
		if(start.row == end.row && start.col == end.col){
			//already on target tile
		}else{
			this.bodies[0].targetVec = {x:0,y:0};
			this.bodies[0].timeStep = timeStep;
			this.bodies[0].step = {x:0,y:0};
			this.bodies[0].aStarResult = [];	
			this.aStarResult = [];
			var graph = new Graph(FLAG.Scene.walkableTiles);
			var start = graph.nodes[start.row][start.col];
			var end = graph.nodes[end.row][end.col];
			this.aStarResult = this.bodies[0].aStarResult = astar.search(graph.nodes, start, end, p.diagonals);
			// result is an array containing the shortest path
			if(this.bodies[0].aStarResult.length > 0){
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.bodies[0].targetVec.x = (FLAG.Scene.Map.gridPoints[this.bodies[0].aStarResult[0].x][this.bodies[0].aStarResult[0].y].x+(FLAG.Scene.Map.tileWidth/2))/FLAG.Box2D.scale;
					this.bodies[0].targetVec.y = (FLAG.Scene.Map.gridPoints[this.bodies[0].aStarResult[0].x][this.bodies[0].aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.bodies[0].targetVec.x = FLAG.Scene.Map.gridPoints[this.bodies[0].aStarResult[0].x][this.bodies[0].aStarResult[0].y].x/FLAG.Box2D.scale;
					this.bodies[0].targetVec.y = (FLAG.Scene.Map.gridPoints[this.bodies[0].aStarResult[0].x][this.bodies[0].aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
				}
	
				this.bodies[0].step.x = (this.bodies[0].targetVec.x - this.bodies[0].fb2Body.GetPosition().x)/(this.bodies[0].timeStep);
				this.bodies[0].step.y = (this.bodies[0].targetVec.y - this.bodies[0].fb2Body.GetPosition().y)/(this.bodies[0].timeStep);
			}
		}
	}		
}

FLAGACTOR.prototype.toTile = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.bodies[0].tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.bodies[0].tileOn.col;};
	p.tile = {row:p.row,col:p.col};

	var tile = p.tile;
	var targetVec = {x:0,y:0};
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		targetVec.x = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].x+(FLAG.Scene.Map.tileWidth/2))/FLAG.Box2D.scale;
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
	}else if(FLAG.Scene.Map.type == "isometric"){
		targetVec.x = FLAG.Scene.Map.gridPoints[tile.row][tile.col].x/FLAG.Box2D.scale;
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
	}
	
	var numBodies = this.bodies.length;
	var offsets = [];
	for(var b=0;b<numBodies;b++){
		//store the offset of each body from body 0
		var posOffset = {x:0,y:0};
		posOffset.x = this.bodies[0].fb2Body.GetPosition().x - this.bodies[b].fb2Body.GetPosition().x;
		posOffset.y = this.bodies[0].fb2Body.GetPosition().y - this.bodies[b].fb2Body.GetPosition().y;
		offsets.push(posOffset);
	}
	//apply position change to all bodies based on body 0
	for(var b=0;b<numBodies;b++){
		this.bodies[b].fb2Body.SetPosition(new b2Vec2(targetVec.x-offsets[b].x,targetVec.y-offsets[b].y));
	}
}

FLAGACTOR.prototype.tweenAlpha = function(p){
	if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
	if(!p.hasOwnProperty('duration')){p.duration = 0;};
	if(!p.hasOwnProperty('ease')){p.ease = this.linear;};
	if(!p.hasOwnProperty('onComplete')){p.onComplete = null;};
	var numBodies = this.bodies.length;
	for(var b=0;b<numBodies;b++){
		FLAG.Tween(this.bodies[b].Sprite, "alpha", p.alpha, p.duration, p.ease, p.onComplete);
	}
}
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGACTOR 



//FLAGBODY
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGBODY(name){
	//PROPERTIES
	this.fb2Body = null;
	this.name = name;
	this.Sprite = null;
	this.tileNext = null;
	this.tileOn = {row:0,col:0};
	return this;
}

FLAGBODY.prototype.addDecal = function(p){
	var decalFound = false;
	if(!p.hasOwnProperty('decal')){
		//do nothing, no decal was given
	}else{
		//if the decal is a name
		if(isNaN(p.decal) == true){
			//find the number that matches the name in the spriteSheets
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			for(var d=0;d<numSpriteSheets;d++){
				if(p.decal == FLAG.Scene.spriteSheets[d].name){
					p.decal = d;
					decalFound = true;
				}
			}
		//if the decal is given as a number
		}else{
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			if(p.decal < numSpriteSheets){
				decalFound = true;
			}
		}
	}
	
	if(decalFound == true){
		var numDecals = this.decals.length;
		if(!p.hasOwnProperty('decalName')){p.decalName = "Decal_"+numDecals;};
		if(!p.hasOwnProperty('x')){p.x = 0;};
		if(!p.hasOwnProperty('y')){p.y = 0;};
		if(!p.hasOwnProperty('playing')){p.playing = true;};
		if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
		if(!p.hasOwnProperty('gui')){p.gui = false;};
		if(!p.hasOwnProperty('front')){p.front = true;};
		
		if(!p.hasOwnProperty('animation')){
			p.animation = null;
		}else{
			var animationFound = false;
			//if the animation is given as a name
			if(isNaN(p.animation) == true){
				//find the number that matches the name in the sprites
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				for(var a=0;a<numAnimations;a++){
					if(p.animation == FLAG.Scene.spriteSheets[p.decal].animations[a].name){
						p.animation = a;
						animationFound = true;
					}
				}
			//if the animation is given as a number
			}else{
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				if(p.animation < numAnimations){
					animationFound = true;
				}
			}
			if(animationFound != true){
				p.animation = null;
			}
		}
		
		if(!p.hasOwnProperty('frame')){
			p.frame = 0;
		}else{
			var frameExists = false;
			//if an animation exists
			if(p.animation != null){
				//if the frame is given as a name
				if(isNaN(p.frame) == true){
					if(p.frame == "startFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].startFrame);
						frameExists = true;
					}else if(p.frame == "endFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				//if frame is given as number
				}else{
					if(p.frame > Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame)){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				}
			//if no animation exists
			}else{
				//does frame exist
				if(p.frame < (FLAG.Scene.spriteSheets[p.decal].tilesWide * FLAG.Scene.spriteSheets[p.decal].tilesHigh)){
					frameExists = true;
				}
			}
			if(frameExists != true){
				p.frame = 0;
			}
		}
		
		this.Sprite.decals.push(new FLAGSPRITE(p.decalName,p.decal,p.x,p.y,p.frame,p.animation,this.layer,p.playing,p.alpha,p.gui,p.front));	
	}
}

FLAGBODY.prototype.applyForce = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('atX')){p.atX = this.fb2Body.GetPosition().x;};
	if(!p.hasOwnProperty('atY')){p.atY = this.fb2Body.GetPosition().y;};
	this.fb2Body.ApplyForce(new b2Vec2(p.x,p.y), new b2Vec2(p.atX,p.atY));
}

FLAGBODY.prototype.applyImpulse = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	if(!p.hasOwnProperty('atX')){p.atX = this.fb2Body.GetPosition().x;};
	if(!p.hasOwnProperty('atY')){p.atY = this.fb2Body.GetPosition().y;};
	this.fb2Body.ApplyImpulse(new b2Vec2(p.x,p.y), new b2Vec2(p.atX,p.atY));
}

FLAGBODY.prototype.applyTorque = function(torque){
	var torque = torque || 0;
	this.fb2Body.ApplyTorque(torque);
}

FLAGBODY.prototype.cameraFollow = function(hideEdge){
	var limit = {};
	var limitAmount = hideEdge || 0;
		
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		limit.x_low = FLAG.Canvas.width - FLAG.Scene.Map.w + limitAmount;
		limit.x_high = 0-limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}else if(FLAG.Scene.Map.type == "isometric"){
		limit.x_low = FLAG.Canvas.width - (FLAG.Scene.Map.w/2) + limitAmount;
		limit.x_high = (FLAG.Scene.Map.w/2) - limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}
		
	//target destination of camera
	var destination = {x:Math.round((FLAG.center.x) - (this.fb2Body.GetPosition().x*FLAG.Box2D.scale)),y:Math.round((FLAG.center.y) - (this.fb2Body.GetPosition().y*FLAG.Box2D.scale))};

	if(FLAG.Canvas.width < FLAG.Scene.Map.w){
		//LIMITS
		if(limit.x_low != null){
			if(destination.x < limit.x_low ){
				destination.x = limit.x_low;
			}
		}

		if(limit.x_high != null){
			if(destination.x > limit.x_high ){
				destination.x = limit.x_high;
			}
		}			
	}else{
		if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
			destination.x = FLAG.center.x - (FLAG.Scene.Map.w/2);					
		}else if(FLAG.Scene.Map.type == "isometric"){
			destination.x = FLAG.center.x;
		}
	}

	if(FLAG.Canvas.height < FLAG.Scene.Map.h){
		//LIMITS
		if(limit.y_low != null){
			if(destination.y < limit.y_low ){
				destination.y = limit.y_low;
			}
		}

		if(limit.y_high != null){
			if(destination.y > limit.y_high ){
				destination.y = limit.y_high;
			}
		}	
	}else{
		destination.y = FLAG.center.y - (FLAG.Scene.Map.h/2);					
	}

	//move camera
	FLAG.Scene.Map.x = Math.round(FLAG.Scene.Map.x + (destination.x - FLAG.Scene.Map.x));
	FLAG.Scene.Map.y = Math.round(FLAG.Scene.Map.y + (destination.y - FLAG.Scene.Map.y));	
}

FLAGBODY.prototype.clicked = function(){	
	//check for both the Body name and
	//check for the Body's parent actor name
	var actors = FLAG.actorsClicked();
	var numActors = actors.length;
	var bodyClicked = false;
	for(var a=0;a<numActors;a++){
		var numBodies = actors[a].bodies.length;
		for(var b=0;b<numBodies;b++){
			if(this.name == actors[a].bodies[b] && this.fb2Body.GetUserData().parentActorName == actors[a].name){
				bodyClicked = true;
			}
		}
	}
	
	return bodyClicked;
}

FLAGBODY.prototype.clickedDecal = function(decal){
	//an array to hold the names of the sprites clicked
	var clickedDecals = [];
	//get the mouse position
	var clickPoint = {x:FLAG.Pointer.mapLoc.x, y:FLAG.Pointer.mapLoc.y};
	var decalFound = false;
	if(decal == null){
		//do nothing, no decal was given
	}else{
		//if the decal is given as a name
		if(isNaN(decal) == true){
			//find the name of the decal
			var numDecals = this.Sprite.decals.length;
			for(var d=0;d<numDecals;d++){
				if(this.Sprite.decals[d].name == decal){
					decal = s;
					decalFound = true;
				}
			}
		//decal given as number
		}else{
			var numDecals = this.Sprite.decals.length;
			if(decal < numDecals){
				decalFound = true;
			}
		}
	}
	if(decalFound == true){
		var theDecal = this.Sprite.decals[decal];
		//get the position of the decal
		var decalRect = FLAG.Scene.spriteSheets[theDecal.pIndex].tileRects[theDecal.frame];
		var decalPoint = {x:(this.fb2Body.GetPosition().x*FLAG.Box2D.scale)+(theDecal.x), y:(this.fb2Body.GetPosition().y*FLAG.Box2D.scale)+(theDecal.y)};
		
		//set up the rect to check
		var checkRect = {x:0,y:0,w:0,h:0};
		checkRect.x = decalPoint.x - ((decalRect.w/2)*FLAG.scale);
		checkRect.y = decalPoint.y - ((decalRect.h/2)*FLAG.scale);
		checkRect.w = decalRect.w*FLAG.scale;
		checkRect.h = decalRect.h*FLAG.scale;
	
		if(FLAG.pointInRect(clickPoint,checkRect) == true){
			clickedDecals.push(theDecal.name);
		}
	}
	if(clickedDecals.length > 0){
		return true;
	}else{
		return false;
	}
}

FLAGBODY.prototype.Decal = function(name){
	var numDecals = this.Sprite.decals.length;
	for(var d=0;d<numDecals;d++){
		if(this.Sprite.decals[d].name == name){
			return this.Sprite.decals[d];
		}	
	}
}

FLAGBODY.prototype.destroy = function(){
	this.name = "destroy";
}

FLAGBODY.prototype.drag = function(){
	var x = FLAG.Pointer.mapLoc.x/FLAG.Box2D.scale;
	var y = FLAG.Pointer.mapLoc.y/FLAG.Box2D.scale;
	this.fb2Body.SetPosition(new b2Vec2(x,y));
}

FLAGBODY.prototype.getAngle = function(){
	return this.fb2Body.GetAngle() * (180/Math.PI);
}

FLAGBODY.prototype.getAngularVelocity = function(){
	return this.fb2Body.GetAngularVelocity();
}

FLAGBODY.prototype.getAnimation = function(){
	return {index:this.Sprite.animation,name:FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations[this.Sprite.animation].name};
}

FLAGBODY.prototype.getInertia = function(){
	return this.fb2Body.GetInertia();
}

FLAGBODY.prototype.getLinearVelocity = function(){
	return this.fb2Body.GetLinearVelocity();
}

FLAGBODY.prototype.getMass = function(){
	return this.fb2Body.GetMass();
}

FLAGBODY.prototype.getPosition = function(){
	return this.fb2Body.GetPosition();
}

FLAGBODY.prototype.isometricMove = function(speed){
	var speed = speed || 0;
	if(FLAG.arrowUp == true && FLAG.arrowRight == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(speed,0));
	}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(0,-speed));
	}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(0,speed));
	}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,0));
	}else{
		if(FLAG.arrowUp == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(speed,-speed*.5));
		}
		if(FLAG.arrowDown== true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,speed*.5));
		}
		if(FLAG.arrowRight == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(speed,speed*.5));
		}
		if(FLAG.arrowLeft == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,-speed*.5));
		}
	}
	if(FLAG.arrowLeft == false && FLAG.arrowRight == false && FLAG.arrowDown== false && FLAG.arrowUp == false){
		this.fb2Body.SetAwake(false);
		this.fb2Body.SetLinearVelocity(new b2Vec2(0,0));
	}
}

FLAGBODY.prototype.linearMove = function(speed){
	var speed = speed || 0;
	if(FLAG.arrowUp == true && FLAG.arrowRight == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(speed,-speed*.5));
	}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,-speed*.5));
	}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(speed,speed*.5));
	}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
		this.fb2Body.SetAwake(true);
		this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,speed*.5));
	}else{
		if(FLAG.arrowUp == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(0,-speed));
		}
		if(FLAG.arrowDown== true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(0,speed));
		}
		if(FLAG.arrowRight == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(speed,0));
		}
		if(FLAG.arrowLeft == true){
			this.fb2Body.SetAwake(true);
			this.fb2Body.SetLinearVelocity(new b2Vec2(-speed,0));
		}
	}
	if(FLAG.arrowLeft == false && FLAG.arrowRight == false && FLAG.arrowDown== false && FLAG.arrowUp == false){
		this.fb2Body.SetAwake(false);
		this.fb2Body.SetLinearVelocity(new b2Vec2(0,0));
	}
}

FLAGBODY.prototype.play = function(){
	this.Sprite.playing = true;
}

FLAGBODY.prototype.removeDecal = function(decal){
	if(decal == null){
		//do nothing, no decal name given
	}else{
		var decalsToKeep = [];
		//if the decal is given as a name
		if(isNaN(decal) == true){
			//find the name of the decal
			var numDecals = this.Sprite.decals.length;
			for(var d=0;d<numDecals;d++){
				if(this.Sprite.decals[d].name != decal){
					decalsToKeep.push(this.Sprite.decals[d]);
				}
			}
		//decal given as number
		}else{
			var numDecals = this.Sprite.decals.length;
			for(var d=0;d<numDecals;d++){
				if(d != decal){
					decalsToKeep.push(this.Sprite.decals[d]);
				}
			}
		}
		
		this.Sprite.decals = [];
		this.Sprite.decals = decalsToKeep;
	}
}

FLAGBODY.prototype.setAngle = function(angle){
	this.fb2Body.SetAngle(angle * (Math.PI/180));
}

FLAGBODY.prototype.setAnimation = function(animation){
	var animationFound = -1;
	//if given as name
	if(isNaN(animation) == true){
		//find the number that matches the name in the actorSheet
		var numAnimations = FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			if(animation == FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations[a].name){
				animationFound = a;
				break;
			}
		}
	//given as a number
	}else{
		var numAnimations = FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations.length;
		if(animation < numAnimations){
			animationFound = animation;
		}
	}
	
	if(animationFound != -1 && this.Sprite.animation != animationFound){
		this.Sprite.frame = FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations[animationFound].startFrame;
		this.Sprite.animation = animationFound;
	}
}

FLAGBODY.prototype.setAwake = function(awake){
	this.fb2Body.SetAwake(awake);
}

FLAGBODY.prototype.setFrame = function(frame){
	var fameFound = false;
	//if given as name
	if(isNaN(frame) == true && this.Sprite.animation != null){
		if(frame == "startFrame"){
			frame = FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations[this.animation].startFrame;
			fameFound = true;
		}else if(value == "endFrame"){
			frame = FLAG.Scene.spriteSheets[this.Sprite.pIndex].animations[this.animation].endFrame;
			fameFound = true;
		}
	//if given as number
	}else{
		if(frame < (FLAG.Scene.spriteSheets[this.Sprite.pIndex].tilesWide * FLAG.Scene.spriteSheets[this.Sprite.pIndex].tilesHigh)){
			fameFound = true;
		}
	}
	
	if(fameFound == true){
		this.Sprite.frame = frame;
	}
}

FLAGBODY.prototype.setLinearVelocity = function(p){
	if(!p.hasOwnProperty('x')){p.x = 0;};
	if(!p.hasOwnProperty('y')){p.y = 0;};
	var adjustedVelocity = {x:0,y:0};
	if(p.x == 0){
		adjustedVelocity.x = this.fb2Body.GetLinearVelocity().x;
	}else{
		adjustedVelocity.x = p.x;
	}
	if(p.y == 0){
		adjustedVelocity.y = this.fb2Body.GetLinearVelocity().y;
	}else{
		adjustedVelocity.y = p.y;
	}
	this.fb2Body.SetAwake(true);
	this.fb2Body.SetLinearVelocity(new b2Vec2(adjustedVelocity.x,adjustedVelocity.y));
}

FLAGBODY.prototype.setPosition = function(p){
	if(!p.hasOwnProperty('x')){p.x = this.fb2Body.GetPosition().x;}else{p.x = p.x/FLAG.Box2D.scale;};
	if(!p.hasOwnProperty('y')){p.y = this.fb2Body.GetPosition().y;}else{p.y = p.y/FLAG.Box2D.scale;};
	this.fb2Body.SetPosition(new b2Vec2(p.x,p.y));
}

FLAGBODY.prototype.stop = function(){
	this.playing = false;
}

FLAGBODY.prototype.tilePath  = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.tileOn.col;};
	if(!p.hasOwnProperty('timeStep')){p.timeStep = 1;};
	if(!p.hasOwnProperty('diagonals')){p.diagonals = false;};
	p.end = {row:p.row,col:p.col};

	var start = {row:this.tileOn.row, col:this.tileOn.col};
	var end = p.end;
	var timeStep = p.timeStep;
	if(end.row < FLAG.Scene.Map.tilesHigh && end.col < FLAG.Scene.Map.tilesWide && end.row >= 0 && end.col >= 0 && FLAG.Scene.walkableTiles[end.row][end.col] != 0){
		if(start.row == end.row && start.col == end.col){
			//already on target tile
		}else{
			this.targetVec = {x:0,y:0};
			this.timeStep = timeStep;
			this.step = {x:0,y:0};
			this.aStarResult = [];	
			var graph = new Graph(FLAG.Scene.walkableTiles);
			var start = graph.nodes[start.row][start.col];
			var end = graph.nodes[end.row][end.col];
			this.aStarResult = astar.search(graph.nodes, start, end, p.diagonals);
			// result is an array containing the shortest path
			if(this.aStarResult.length > 0){
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.targetVec.x = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x+(FLAG.Scene.Map.tileWidth/2))/FLAG.Box2D.scale;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.targetVec.x = FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x/FLAG.Box2D.scale;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}
	
				this.step.x = (this.targetVec.x - this.fb2Body.GetPosition().x)/(this.timeStep);
				this.step.y = (this.targetVec.y - this.fb2Body.GetPosition().y)/(this.timeStep);
			}
		}
	}		
}

FLAGBODY.prototype.toTile = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.tileOn.col;};
	p.tile = {row:p.row,col:p.col};

	var tile = p.tile;
	var targetVec = {x:0,y:0};
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		targetVec.x = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].x+(FLAG.Scene.Map.tileWidth/2))/FLAG.Box2D.scale;
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
	}else if(FLAG.Scene.Map.type == "isometric"){
		targetVec.x = FLAG.Scene.Map.gridPoints[tile.row][tile.col].x/FLAG.Box2D.scale;
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
	}
	this.fb2Body.SetPosition(new b2Vec2(targetVec.x,targetVec.y));
}

FLAGBODY.prototype.travelTilePath = function(){
	if(this.aStarResult != null){
		//step between tiles
		var setX = 0;
		var setY = 0;
		
		//moving left
		if(this.step.x < 0){
			//if the next step is past the target	
			if((this.fb2Body.GetPosition().x + this.step.x) < this.targetVec.x){
				//set it to the target
				setX = this.targetVec.x;
			}else{
				//take a step
				setX = this.fb2Body.GetPosition().x + this.step.x;
			}
			
		//moving right
		}else if(this.step.x > 0){
			//if the next step is past the target	
			if((this.fb2Body.GetPosition().x + this.step.x) > this.targetVec.x){
				//set it to the target
				setX = this.targetVec.x;
			}else{
				//take a step
				setX = this.fb2Body.GetPosition().x + this.step.x;
			}
			
		//horizontally correct
		}else if(this.step.x == 0){
			//set it to the target
			setX = this.targetVec.x;
		}
		
		//moving up
		if(this.step.y < 0){
			//if the next step is past the target	
			if((this.fb2Body.GetPosition().y + this.step.y) < this.targetVec.y){
				//set it to the target
				setY = this.targetVec.y;
			}else{
				//take a step
				setY = this.fb2Body.GetPosition().y + this.step.y;
			}
		//moving down	
		}else if(this.step.y > 0){
			//if the next step is past the target	
			if((this.fb2Body.GetPosition().y + this.step.y) > this.targetVec.y){
				//set it to the target
				setY = this.targetVec.y;
			}else{
				//take a step
				setY = this.fb2Body.GetPosition().y + this.step.y;
			}
			
		//vertically correct
		}else if(this.step.y == 0){
			//set it to the target
			setY = this.targetVec.y;
		}
		
		this.fb2Body.SetPosition(new b2Vec2(setX,setY));
		
		//reached tile?
		if(setX == this.targetVec.x && setY == this.targetVec.y){
			this.aStarResult.splice(0,1);
			//new tile target?
			if(this.aStarResult.length > 0){
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.targetVec.x = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x+(FLAG.Scene.Map.tileWidth/2))/FLAG.Box2D.scale;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.targetVec.x = FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x/FLAG.Box2D.scale;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2))/FLAG.Box2D.scale;
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}
				
				this.step.x = (this.targetVec.x - this.fb2Body.GetPosition().x)/(this.timeStep);
				this.step.y = (this.targetVec.y - this.fb2Body.GetPosition().y)/(this.timeStep);
			//no more tile targets
			}else{
				this.aStarResult = null;
				this.fb2Body.SetPosition(new b2Vec2(this.targetVec.x,this.targetVec.y));
				this.tileNext = null;
			}
		}
	}
}

FLAGBODY.prototype.tweenAlpha = function(p){
	if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
	if(!p.hasOwnProperty('duration')){p.duration = 0;};
	if(!p.hasOwnProperty('ease')){p.ease = this.linear;};
	if(!p.hasOwnProperty('onComplete')){p.onComplete = null;};

	FLAG.Tween(this.Sprite, "alpha", p.alpha, p.duration, p.ease, p.onComplete);
}
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGBODY 




//FLAGJOINT
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGJOINT(name){
	//PROPERTIES
	this.name = name;
	this.fb2Joint = null;
	return this;
}

FLAGJOINT.prototype.destroy = function(){
	this.name = "destroy";
}

FLAGJOINT.prototype.getAnchorA = function(){
	return this.fb2Joint.GetAnchorA();
}

FLAGJOINT.prototype.getAnchorB = function(){
	return this.fb2Joint.GetAnchorB();
}

FLAGJOINT.prototype.getAngle = function(){
	return (this.fb2Joint.GetJointAngle()*(180/Math.PI));
}

FLAGJOINT.prototype.getBodyA = function(){
	return this.fb2Joint.GetBodyA();
}

FLAGJOINT.prototype.getBodyB = function(){
	return this.fb2Joint.GetBodyB();
}

FLAGJOINT.prototype.getMotorTorque = function(){
	return this.fb2Joint.GetMotorTorque();
}

FLAGJOINT.prototype.getReactionForce = function(){
	return this.fb2Joint.GetReactionForce();
}

FLAGJOINT.prototype.getReactionTorque = function(){
	return this.fb2Joint.GetReactionTorque();
}

FLAGJOINT.prototype.getSpeed = function(){
	return this.fb2Joint.GetJointSpeed();
}

FLAGJOINT.prototype.setMaxMotorTorque = function(maxTorque){
	var maxTorque = maxTorque || 0;
	this.fb2Joint.SetMaxMotorTorque(maxTorque);
}

FLAGJOINT.prototype.setMotorSpeed = function(speed){
	var speed = speed || 0;
	this.fb2Joint.SetMotorSpeed(speed);
}

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGJOINT 




//FLAGSCENE
//Constructor for the a FLAGSCENE class
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGSCENE(sceneIndex){
	
	//PROPERTIES
	this.actors = [];
	this.alpha = 1;
	this.bgColor = POLE.scenes[sceneIndex].bgColor;
	this.bgImage = null;
	this.dragging = false;
	this.gravity = new b2Vec2(0,10);
	this.images = [];
	this.layers = [];
	this.loadInterval = null;
	
	//Map
	//--------------------------------------------------
	var tileWidth = POLE.scenes[sceneIndex].tileWidth;
	var tileHeight = POLE.scenes[sceneIndex].tileHeight;
	var tilesWide = POLE.scenes[sceneIndex].tilesWide;
	var tilesHigh = POLE.scenes[sceneIndex].tilesHigh;
	
	this.Map = {
		type		:	POLE.scenes[sceneIndex].type,
		x			:	0,
		y			:	0,
		w			:	0,
		h			:	0,
		gridPoints	:	[],
		lastX		:	0,
		lastY		:	0,
		tileWidth	:	tileWidth,
		tileHeight	:	tileHeight,
		tilesWide	:	tilesWide,
		tilesHigh	:	tilesHigh,
		camLoc		:	{x:0,y:0}
	};
	this.Map.gridPoints = [];		
	var array_Seg = [];
	switch(POLE.scenes[sceneIndex].type){
		case "orthogonal":
			for (var i = 0; i<tilesHigh; i++){
				for (var j = 0; j<tilesWide; j++){
					array_Seg.push ({x:(j*tileWidth),y:(i*tileHeight)});
				};		
				this.Map.gridPoints.push (array_Seg);
				array_Seg = [];
			}
			this.Map.w = tileWidth * tilesWide;
			this.Map.h = tileHeight * tilesHigh;
			break;
		case "isometric":
			for (var i = 0; i<tilesHigh+1; i++){
				for (var j = 0; j<tilesWide+1; j++){
					var isoX = ((tileWidth*.5)*j)-((tileWidth*.5)*i);
					var isoY = ((tileWidth*.25)*i)+((tileWidth*.25)*j);													
					array_Seg.push ({x:(isoX),y:(isoY)});
				};
				this.Map.gridPoints.push (array_Seg);
				array_Seg = [];
			}
			this.Map.w = (tilesWide+tilesHigh)*tileWidth/2;
			this.Map.h = (tilesWide+tilesHigh)*tileHeight/2;
			break;
		case "hexagonal":
			for (var i = 0; i<tilesHigh; i++){
				for (var j = 0; j<tilesWide; j++){
					var hexX = (j * (tileWidth*.5) * 1.5);
					var hexY = (i * tileHeight + (j % 2) * tileHeight / 2);												
					array_Seg.push ({x:(hexX),y:(hexY)});
				};
				this.Map.gridPoints.push (array_Seg);
				array_Seg = [];
			}			
			this.Map.w = this.Map.gridPoints[0][tilesWide-1].x + tileWidth;
			this.Map.h = this.Map.gridPoints[tilesHigh-1][tilesWide-1].y + tileHeight;
			break;
	}
	//--------------------------------------------------
	//END Map
	
	this.name = POLE.scenes[sceneIndex].name;
	this.pIndex = sceneIndex;
	this.scale = 1;
	this.sprites = [];
	this.spriteSheets = [];
	this.tiledObjects = [];
	this.tiledObjectSheets = [];
	this.tileSheets = [];
	this.tileSprites = [];
	this.tweens = [];
	this.useWTC = true;
	this.walkableTiles = [];	
	this.worldColliders = [];
	
	
	//LOAD SCENE ASSETS	
	//-----------------------------------------------------------------------
	//IMAGES
	//want to make some kind of search to see if images are need for the scene
	//cause probably don't want to load every image in the game for every scene
	//must still load a place holder in the images
	var numImages = POLE.images.length;
	for(var i=0;i<numImages;i++){
		//image
		this.images.push(new Image());
		this.images[i].name = POLE.images[i].name;	
		this.images[i].src = POLE.images[i].url;
		
		if(POLE.display.imageBuffer == undefined){
			POLE.display.imageBuffer = false;
		}
				
		if(POLE.display.imageBuffer == true){	
			//buffer canvas	
			this.images[i].canvas = document.createElement('canvas');
			this.images[i].canvas.name = POLE.images[i].name;	
			this.images[i].canvas.src = POLE.images[i].url;	
		}
	}
	
	//BACKGROUND IMAGE
	if(POLE.scenes[this.pIndex].bgImage != null){
		
		if(POLE.display.imageBuffer == false){
			//uses image	
			this.bgImage = this.images[POLE.scenes[this.pIndex].bgImage];
		}else{
			//uses a canvas with the image on it
			this.bgImage = this.images[POLE.scenes[pIndex].bgImage].canvas;
		}
		
	}else{
		this.bgImage = null;
	}
	
	//TILESHEETS
	var numTileSheets = POLE.tileSheets.length;
	for(var i=0;i<numTileSheets;i++){
		this.tileSheets.push(this.createTileSheet(i));
	}
	
	//TILED OBJECT SHEETS
	var numTiledObjectSheets = POLE.tiledObjectSheets.length;
	for(var i=0;i<numTiledObjectSheets;i++){		
		this.tiledObjectSheets.push(this.createTiledObjectSheet(i));
	}
	
	//SPRITE SHEETS
	var numSpriteSheets = POLE.spriteSheets.length;
	for(var i=0;i<numSpriteSheets;i++){	
		this.spriteSheets.push(this.createSpriteSheet(i));
	}
	
	//ACTORS IN SCENE
	var numActors = POLE.scenes[this.pIndex].actors.length;
	for(var i=0;i<numActors;i++){
		var newActor = new FLAGACTOR(POLE.scenes[this.pIndex].actors[i].pIndex,POLE.scenes[this.pIndex].actors[i].name,POLE.scenes[this.pIndex].actors[i].position,POLE.scenes[this.pIndex].actors[i].layer);
		this.actors.push(newActor);
		var numBodies = POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].bodies.length;
		var bodies = [];
		for(var b=0;b<numBodies;b++){
			var newActor_Body = new FLAGBODY(POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].bodies[b].name);
			newActor_Body.shape = POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].bodies[b].shape;
			newActor_Body.shapeDefinition = POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].bodies[b].shapeDefinition;
			newActor.bodies.push(newActor_Body);
		}
		var numJoints = POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].joints.length;
		var joints = [];
		for(var j=0;j<numJoints;j++){
			var newActor_Joint = new FLAGJOINT(POLE.actors[POLE.scenes[this.pIndex].actors[i].pIndex].joints[j].name);
			newActor.joints.push(newActor_Joint);
		}
	}

	//LAYERS
	var numLayers = POLE.scenes[this.pIndex].layers.length;
	for(var l=0;l<numLayers;l++){
		this.layers.push({
			alpha			:	POLE.scenes[this.pIndex].layers[l].alpha,
			tileIDs			:	POLE.scenes[this.pIndex].layers[l].tileIDs,
			tileSheetIDs	:	POLE.scenes[this.pIndex].layers[l].tileSheetIDs,
			tiledObjectIDs	:	POLE.scenes[this.pIndex].layers[l].tiledObjectIDs,
			offset			:	{x:0,y:0},
			offsetScroll	:	{x:0,y:0},
			visible			:	POLE.scenes[this.pIndex].layers[l].visible,
			drawTileBounds	:	{row:{first:0,last:0},col:{first:0,last:0}},
			tilesToDrawIso	:	[],
			preRender		:	{on:false,canvas:null}
		});
	}

	//WALKABLE TILES
	this.walkableTiles = POLE.scenes[this.pIndex].walkableTiles;
	
	//TILE SPRITES
	this.tileSprites = [];
	var numTileSprites = POLE.scenes[this.pIndex].tileSprites.length;
	for(var ts=0;ts<numTileSprites;ts++){
		this.tileSprites.push(new FLAGTILESPRITE(POLE.scenes[this.pIndex].tileSprites[ts].name,POLE.scenes[this.pIndex].tileSprites[ts].pIndex,POLE.scenes[this.pIndex].tileSprites[ts].row,POLE.scenes[this.pIndex].tileSprites[ts].col,POLE.scenes[this.pIndex].tileSprites[ts].animation,POLE.scenes[this.pIndex].tileSprites[ts].frame,POLE.scenes[this.pIndex].tileSprites[ts].layer));
	}
	
	//TILED OBJECTS
	var numTiledObjects = POLE.scenes[this.pIndex].tiledObjects.length;
	for(var t=0;t<numTiledObjects;t++){
		this.includeTiledObject(POLE.scenes[this.pIndex].tiledObjects[t].name,POLE.scenes[this.pIndex].tiledObjects[t].pIndex,POLE.scenes[this.pIndex].tiledObjects[t].layer,POLE.scenes[this.pIndex].tiledObjects[t].row,POLE.scenes[this.pIndex].tiledObjects[t].col,POLE.scenes[this.pIndex].tiledObjects[t].animation,POLE.scenes[this.pIndex].tiledObjects[t].frame);
	}
	
	//SPRITES
	this.sprites = [];
	var numSprites = POLE.scenes[this.pIndex].sprites.length;
	for(var d=0;d<numSprites;d++){
		this.sprites.push(new FLAGSPRITE(POLE.scenes[this.pIndex].sprites[d].name,POLE.scenes[this.pIndex].sprites[d].pIndex,POLE.scenes[this.pIndex].sprites[d].position.x,POLE.scenes[this.pIndex].sprites[d].position.y,POLE.scenes[this.pIndex].sprites[d].frame,POLE.scenes[this.pIndex].sprites[d].animation,POLE.scenes[this.pIndex].sprites[d].layer));
	}
	
	//WORLD COLLIDERS
	this.useWTC = POLE.scenes[this.pIndex].useWTC;
	var numWorldColliders = POLE.scenes[this.pIndex].worldColliders.length;
	for(var wc=0;wc<numWorldColliders;wc++){
		//exclude walkableTileColliders
		if(POLE.scenes[this.pIndex].worldColliders[wc].editable != false){
			this.worldColliders.push(POLE.scenes[this.pIndex].worldColliders[wc]);
		}
	}

	//GRAVITY
	this.gravity = POLE.scenes[this.pIndex].gravity;
}


//CREATE SPRITES SHEET
//------------------------------------------------------------------
FLAGSCENE.prototype.createSpriteSheet = function(pIndex){
	var spriteSheet = { name		:	POLE.spriteSheets[pIndex].name,
						pIndex		:	pIndex,
						image		:	null,
						tileWidth	:	POLE.spriteSheets[pIndex].tileDimensions.w,
						tileHeight	:	POLE.spriteSheets[pIndex].tileDimensions.h,
						tilesWide	:	POLE.spriteSheets[pIndex].numTiles.w,
						tilesHigh 	:	POLE.spriteSheets[pIndex].numTiles.h,
						startX		:	POLE.spriteSheets[pIndex].origin.x,
						startY		:	POLE.spriteSheets[pIndex].origin.y,
						offset		:	POLE.spriteSheets[pIndex].offset,
						animations	:	POLE.spriteSheets[pIndex].animations || [],
						tileRects	:	[]
	};
	
	if(POLE.display.imageBuffer == false){
		//use the image
		spriteSheet.image = this.images[POLE.spriteSheets[pIndex].image];
	}else{
		//uses a canvas with the image on it
		spriteSheet.image = this.images[POLE.spriteSheets[pIndex].image].canvas;
	}
	
	//TILE RECTS
	for (var i =0; i < spriteSheet.tilesHigh; i++){
		for (var j =0; j < spriteSheet.tilesWide; j++){
			spriteSheet.tileRects.push({x:(j*spriteSheet.tileWidth)+spriteSheet.startX,y:(i*spriteSheet.tileHeight)+spriteSheet.startY,w:spriteSheet.tileWidth,h:spriteSheet.tileHeight});
		}
	}	
	
	return spriteSheet;
}
//------------------------------------------------------------------
//END CREATE SPRITES SHEET


//CREATE TILED OBJECTS SHEET
//------------------------------------------------------------------
FLAGSCENE.prototype.createTiledObjectSheet = function(pIndex){
	var tiledObjectSheet = { 	
						name				:	POLE.tiledObjectSheets[pIndex].name,
						pIndex				:	pIndex,
						image				:	null,
						tileWidth			:	POLE.tiledObjectSheets[pIndex].tileDimensions.w,
						tileHeight			:	POLE.tiledObjectSheets[pIndex].tileDimensions.h,
						cols				:	POLE.tiledObjectSheets[pIndex].numTiles.w,
						rows				:	POLE.tiledObjectSheets[pIndex].numTiles.h,
						startX				:	POLE.tiledObjectSheets[pIndex].origin.x,
						startY				:	POLE.tiledObjectSheets[pIndex].origin.y,
						width				:	POLE.tiledObjectSheets[pIndex].frameSize.w,
						height				:	POLE.tiledObjectSheets[pIndex].frameSize.h,
						framesWide			:	POLE.tiledObjectSheets[pIndex].numFrames.w || 1,
						framesHigh			:	POLE.tiledObjectSheets[pIndex].numFrames.h || 1,
						animations			: 	POLE.tiledObjectSheets[pIndex].animations || [],
						tileRects			:	[]
	};
	
	if(POLE.display.imageBuffer == false){
		//use the image
		tiledObjectSheet.image = this.images[POLE.tiledObjectSheets[pIndex].image];
	}else{
		//uses a canvas with the image on it
		tiledObjectSheet.image = this.images[POLE.tiledObjectSheets[pIndex].image].canvas;
	}
	
	//TILE RECTS
	switch(POLE.scenes[this.pIndex].type){
		case "orthogonal":
			for(var fh=0;fh<tiledObjectSheet.framesHigh;fh++){
				for(var fw=0;fw<tiledObjectSheet.framesWide;fw++){
					var frame = new Array;
					//zero tile is blank
					frame.push({x:0,y:0,w:0,h:0});
					var rowsHeight = tiledObjectSheet.rows * tiledObjectSheet.tileHeight;
					for(var r=0;r<tiledObjectSheet.rows;r++){
						for(var c=0;c<tiledObjectSheet.cols;c++){
							frame.push({x:tiledObjectSheet.startX+(tiledObjectSheet.width*fw)+(c*tiledObjectSheet.tileWidth),y:tiledObjectSheet.startY+(tiledObjectSheet.height*fh),w:tiledObjectSheet.tileWidth,h:tiledObjectSheet.height});
						}
					}
					tiledObjectSheet.tileRects.push(frame);
				}
			}
			break;
		case "isometric":
			for(var fh=0;fh<tiledObjectSheet.framesHigh;fh++){
				for(var fw=0;fw<tiledObjectSheet.framesWide;fw++){
					var frame = new Array;
					//zero tile is blank
					frame.push({x:0,y:0,w:0,h:0});
					var row = 0;
					for(var r=tiledObjectSheet.rows;r>1;r--){
						frame.push({x:(tiledObjectSheet.startX+tiledObjectSheet.width)-tiledObjectSheet.tileWidth-(row*(tiledObjectSheet.tileWidth*.5))+(fw*tiledObjectSheet.width),y:tiledObjectSheet.startY+(fh*tiledObjectSheet.height),w:tiledObjectSheet.tileWidth,h:tiledObjectSheet.height-((r-1)*(tiledObjectSheet.tileHeight/2))});
						row+=1;
					}
					var col = 0;
					for(var c=tiledObjectSheet.cols;c>0;c--){
						frame.push({x:(col*(tiledObjectSheet.tileWidth*.5))+tiledObjectSheet.startX+(fw*tiledObjectSheet.width),y:tiledObjectSheet.startY+(fh*tiledObjectSheet.height),w:tiledObjectSheet.tileWidth,h:tiledObjectSheet.height-((c-1)*(tiledObjectSheet.tileHeight/2))});
						col+=1;
					}
					tiledObjectSheet.tileRects.push(frame);
				}
			}
			break;
		case "hexagonal":
			for(var fh=0;fh<tiledObjectSheet.framesHigh;fh++){
				for(var fw=0;fw<tiledObjectSheet.framesWide;fw++){
					var frame = new Array;
					//zero tile is blank
					frame.push({x:0,y:0,w:0,h:0});
					var rowsHeight = tiledObjectSheet.rows * tiledObjectSheet.tileHeight;
					for(var r=0;r<tiledObjectSheet.rows;r++){
						for(var c=0;c<tiledObjectSheet.cols;c++){
							var hexX = (c * (tiledObjectSheet.tileWidth*.5) * 1.5);
							frame.push({x:tiledObjectSheet.startX+(tiledObjectSheet.width*fw)+(hexX),y:tiledObjectSheet.startY+(tiledObjectSheet.height*fh),w:tiledObjectSheet.tileWidth,h:tiledObjectSheet.height});
						}
					}
					tiledObjectSheet.tileRects.push(frame);
				}
			}	
			break;
	}
	
	return tiledObjectSheet;
}
//------------------------------------------------------------------
//END CREATE TILED OBJECTS SHEET


//CREATE TILE SHEET
//------------------------------------------------------------------
FLAGSCENE.prototype.createTileSheet = function(pIndex){
	var tileSheet = { 	name				:	POLE.tileSheets[pIndex].name,
						pIndex				:	pIndex,
						image				:	null,
						tileWidth			:	POLE.tileSheets[pIndex].tileDimensions.w,
						tileHeight			:	POLE.tileSheets[pIndex].tileDimensions.h,
						tilesWide			:	POLE.tileSheets[pIndex].numTiles.w,
						tilesHigh 			:	POLE.tileSheets[pIndex].numTiles.h,
						startX				:	POLE.tileSheets[pIndex].origin.x,
						startY				:	POLE.tileSheets[pIndex].origin.y,	
						animations			: 	POLE.tileSheets[pIndex].animations || [],
						tileRects			:	[]
	};
	
	if(POLE.display.imageBuffer == false){
		//uses the image
		tileSheet.image = this.images[POLE.tileSheets[pIndex].image];
	}else{
		//uses a canvas with the image on it
		tileSheet.image = this.images[POLE.tileSheets[pIndex].image].canvas;
	}
	
	//TILE RECTS
	//zero tile is blank
	tileSheet.tileRects.push({x:0,y:0,w:0,h:0})
	for (var i = 0; i < tileSheet.tilesHigh; i++){
		for (var j = 0; j < tileSheet.tilesWide; j++){
			tileSheet.tileRects.push({x:(j*tileSheet.tileWidth)+tileSheet.startX,y:(i*tileSheet.tileHeight)+tileSheet.startY,w:tileSheet.tileWidth,h:tileSheet.tileHeight});
		}
	}	
	
	return tileSheet;
}
//------------------------------------------------------------------
//END CREATE TILE SHEET


//DRAG START
//------------------------------------------------------------------
FLAGSCENE.prototype.dragStart = function(){
	this.dragging = true;
}
//------------------------------------------------------------------
//END DRAG START


//DRAG STOP
//------------------------------------------------------------------
FLAGSCENE.prototype.dragStop = function(){
	this.dragging = false;
}
//------------------------------------------------------------------
//END DRAG STOP


//INCLUDE TILED OBJECT
//adds a tiled object to the scene's tiledObjects array, and adjusts the tileIDs and tiledObjectIDs
//------------------------------------------------------------------
FLAGSCENE.prototype.includeTiledObject = function(name,pIndex,layer,row,col,animation,frame){

	//create a new FLAGTILEDOBJECT in the Scene's tiledObjects
	this.tiledObjects.push(new FLAGTILEDOBJECT(name,pIndex,layer,row,col,animation,frame));

	
	//add the tiled object to the arrays
	switch(this.Map.type){
		case "orthogonal":
			var numRows = this.tiledObjectSheets[pIndex].rows;
			var numCols = this.tiledObjectSheets[pIndex].cols;
			var tileCount = 1;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					this.layers[layer].tileIDs[row+r][col+c] = tileCount;
					this.layers[layer].tiledObjectIDs[row+r][col+c] = this.tiledObjects.length;
					tileCount += 1;
				}
			}
			break;
		case "isometric":
			var numRows = this.tiledObjectSheets[pIndex].rows;
			var numCols = this.tiledObjectSheets[pIndex].cols;
			var tileCount = 1;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					//skip all the back rows, except for the last column of those rows
					//because they will not be see by the draw, since the tiles extend upward
					if(r!=numRows-1){
						if(c!=numCols-1){
							this.layers[layer].tileIDs[row+r][col+c] = 0;
						}else{
							//include the last column of each row
							this.layers[layer].tileIDs[row+r][col+c] = tileCount;
							tileCount += 1;
						}
					}else{
						//include every column of the front row
						this.layers[layer].tileIDs[row+r][col+c] = tileCount;
						tileCount += 1;
					}
					this.layers[layer].tiledObjectIDs[row+r][col+c] = this.tiledObjects.length;
				}
			}
			break;
		case "hexagonal":
			var numRows = this.tiledObjectSheets[pIndex].rows;
			var numCols = this.tiledObjectSheets[pIndex].cols;
			var tileCount = 1;
			for(var r=0;r<numRows;r++){
				for(var c=0;c<numCols;c++){
					this.layers[layer].tileIDs[row+r][col+c] = tileCount;
					this.layers[layer].tiledObjectIDs[row+r][col+c] = this.tiledObjects.length;
					tileCount += 1;
				}
			}
			break;
	}
}
//------------------------------------------------------------------
//END INCLUDE TILED OBJECT

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGSCENE




//FLAGSOUND
//Constructor for the FLAGSOUND class
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
function FLAGSOUND(name,audioOptions){
	//check if sounds already has a sound by the name
	//if it does, do not replace it
	var numSounds = FLAG.Sounds.length;
	var soundExists = false;
	for(var s=0;s<numSounds;s++){
		if(FLAG.Sounds[s].name == name){
			soundExists = true;
		}
	}
	
	if(soundExists == false){
		var audioType = "";
		var audio = new Audio();
		var canPlayMP3 = (typeof audio.canPlayType === "function" && audio.canPlayType('audio/mpeg; codecs="mp3"') !== "");
		var canPlayOgg = (typeof audio.canPlayType === "function" && audio.canPlayType('audio/ogg; codecs="vorbis"') !== "");
		if(canPlayOgg == true){
			audioType = "ogg";
		}else if(canPlayMP3 == true){		
			audioType = "mp3";
		}
	
		if(audioType == "ogg"){
			this.name = name;
			this.audioTag = document.createElement('audio');
			this.audioTag.setAttribute('src',audioOptions[0]);
			this.audioTag.load();
			this.looped = false;
		}else if(audioType == "mp3"){
			this.name = name;
			this.audioTag = document.createElement('audio');
			this.audioTag.setAttribute('src',audioOptions[1]);
			this.audioTag.load();
			this.looped = false;
		}
	}
	
	return this;
}

FLAGSOUND.prototype.loop = function(){
	this.play();
}

FLAGSOUND.prototype.loopStart = function(){
	this.play();
	if(this.looped == false){
		this.audioTag.addEventListener('ended', this.loop, false);
		this.looped = true;
	}
}

FLAGSOUND.prototype.loopStop = function(){
	if(this.looped == true){
		this.audioTag.removeEventListener('ended', this.loop, false);
		this.looped = false;
	}
}

FLAGSOUND.prototype.play = function(){
	try{	
		this.audioTag.currentTime = 0;
		this.audioTag.play();
	}catch(err){
		//no audio
	}
}

FLAGSOUND.prototype.stop = function(){
	try{	
		this.audioTag.pause();
	}catch(err){
		//no audio
	}
}

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGSOUND




//FLAGSPRITE
//Constructor for the FLAGSPRITE class
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGSPRITE(name,pIndex,x,y,frame,animation,layer,playing,alpha,gui,front){
	//PROPERTIES
	if(alpha == undefined){this.alpha = 1}else{this.alpha = alpha};
	if(animation == undefined){this.animation = null}else{this.animation = animation};
	this.decals = [];
	this.draw = true;
	if(frame == undefined){this.frame = 0}else{this.frame = frame};
	if(front == undefined){this.front = true}else{this.front = front};
	if(gui == undefined){this.gui = false}else{this.gui = gui};
	if(layer == undefined){this.layer = 0}else{this.layer = layer};
	this.loop = true;
	this.loopCount = null;
	this.loops = 0;
	this.name = name;
	this.pIndex = pIndex;
	if(playing == undefined){this.playing = true}else{this.playing = playing};
	this.scale = 1;
	this.tileNext = null;
	this.tileOn = {row:0,col:0};
	this.x = x;
	this.y = y;
	this.update = null;
}

FLAGSPRITE.prototype.addDecal = function(p){
	if(p == null || typeof p != "object"){var p={};};
	var decalFound = false;
	if(!p.hasOwnProperty('decal')){
		//do nothing, no decal was given
	}else{
		//if the decal is a name
		if(isNaN(p.decal) == true){
			//find the number that matches the name in the spriteSheets
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			for(var s=0;s<numSpriteSheets;s++){
				if(p.decal == FLAG.Scene.spriteSheets[s].name){
					p.decal = s;
					decalFound = true;
				}
			}
		//if the decal is given as a number
		}else{
			var numSpriteSheets = FLAG.Scene.spriteSheets.length;
			if(p.decal < numSpriteSheets){
				decalFound = true;
			}
		}
	}

	if(decalFound == true){
		var numDecals = this.decals.length;
		if(!p.hasOwnProperty('decalName')){p.decalName = "Decal_"+numDecals;};
		if(!p.hasOwnProperty('x')){p.x = 0;};
		if(!p.hasOwnProperty('y')){p.y = 0;};
		if(!p.hasOwnProperty('layer')){p.layer = this.layer;};
		if(!p.hasOwnProperty('playing')){p.playing = true;};
		if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
		if(!p.hasOwnProperty('gui')){p.gui = false;};
		if(!p.hasOwnProperty('front')){p.front = true;};

		if(!p.hasOwnProperty('animation')){
			p.animation = null;
		}else{
			var animationFound = false;
			//if the animation is given as a name
			if(isNaN(p.animation) == true){
				//find the number that matches the name in the sprites
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				for(var a=0;a<numAnimations;a++){
					if(p.animation == FLAG.Scene.spriteSheets[p.decal].animations[a].name){
						p.animation = a;
						animationFound = true;
					}
				}
			//if the animation is given as a number
			}else{
				var numAnimations = FLAG.Scene.spriteSheets[p.decal].animations.length;
				if(p.animation < numAnimations){
					animationFound = true;
				}
			}
			if(animationFound != true){
				p.animation = null;
			}
		}

		if(!p.hasOwnProperty('frame')){
			p.frame = 0;
		}else{
			var frameExists = false;
			//if an animation exists
			if(p.animation != null){
				//if the frame is given as a name
				if(isNaN(p.frame) == true){
					if(p.frame == "startFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].startFrame);
						frameExists = true;
					}else if(p.frame == "endFrame"){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				//if frame is given as number
				}else{
					if(p.frame > Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame)){
						p.frame = Number(FLAG.Scene.spriteSheets[p.decal].animations[p.animation].endFrame);
						frameExists = true;
					}
				}
			//if no animation exists
			}else{
				//does frame exist
				if(p.frame < (FLAG.Scene.spriteSheets[p.decal].tilesWide * FLAG.Scene.spriteSheets[p.decal].tilesHigh)){
					frameExists = true;
				}
			}
			if(frameExists != true){
				p.frame = 0;
			}
		}

		this.decals.push(new FLAGSPRITE(p.decalName,p.decal,p.x,p.y,p.frame,p.animation,p.layer,p.playing,p.alpha,p.gui,p.front));
	
	}
}

FLAGSPRITE.prototype.cameraFollow = function(hideEdge){
	var limit = {};
	var limitAmount = hideEdge || 0;
		
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		limit.x_low = FLAG.Canvas.width - FLAG.Scene.Map.w + limitAmount;
		limit.x_high = 0-limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}else if(FLAG.Scene.Map.type == "isometric"){
		limit.x_low = FLAG.Canvas.width - (FLAG.Scene.Map.w/2) + limitAmount;
		limit.x_high = (FLAG.Scene.Map.w/2) - limitAmount;
		limit.y_low = FLAG.Canvas.height - FLAG.Scene.Map.h + limitAmount;
		limit.y_high = 0-limitAmount;
	}
		
	//target destination of camera
	var destination = {x:Math.round((FLAG.center.x) - (this.x)),y:Math.round((FLAG.center.y) - (this.y))};

	if(FLAG.Canvas.width < FLAG.Scene.Map.w){
		//LIMITS
		if(limit.x_low != null){
			if(destination.x < limit.x_low ){
				destination.x = limit.x_low;
			}
		}

		if(limit.x_high != null){
			if(destination.x > limit.x_high ){
				destination.x = limit.x_high;
			}
		}			
	}else{
		if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
			destination.x = FLAG.center.x - (FLAG.Scene.Map.w/2);					
		}else if(FLAG.Scene.Map.type == "isometric"){
			destination.x = FLAG.center.x;
		}
	}

	if(FLAG.Canvas.height < FLAG.Scene.Map.h){
		//LIMITS
		if(limit.y_low != null){
			if(destination.y < limit.y_low ){
				destination.y = limit.y_low;
			}
		}

		if(limit.y_high != null){
			if(destination.y > limit.y_high ){
				destination.y = limit.y_high;
			}
		}	
	}else{
		destination.y = FLAG.center.y - (FLAG.Scene.Map.h/2);					
	}

	//move camera
	FLAG.Scene.Map.x = Math.round(FLAG.Scene.Map.x + (destination.x - FLAG.Scene.Map.x));
	FLAG.Scene.Map.y = Math.round(FLAG.Scene.Map.y + (destination.y - FLAG.Scene.Map.y));	
}

FLAGSPRITE.prototype.clicked = function(){
	//an array to hold the names of the sprites clicked
	var spritesClicked = [];
	//get the mouse position
	var clickPoint = {x:FLAG.Pointer.mapLoc.x, y:FLAG.Pointer.mapLoc.y};
	var spriteRect = FLAG.Scene.spriteSheets[this.pIndex].tileRects[this.frame];
	var offset = {x:FLAG.Scene.spriteSheets[this.pIndex].offset.x,y:FLAG.Scene.spriteSheets[this.pIndex].offset.y};
	if(this.gui == false){
		var spritePoint = {x:this.x+offset.x, y:this.y+offset.y};
	}else if(this.gui == true){
		var spritePoint = {x:this.x-FLAG.Scene.Map.x+offset.y, y:this.y-FLAG.Scene.Map.y+offset.y};
	}
	
	//set up the rect to check
	var checkRect = {x:0,y:0,w:0,h:0};
	checkRect.x = spritePoint.x - ((spriteRect.w/2)*FLAG.scale);
	checkRect.y = spritePoint.y - ((spriteRect.h/2)*FLAG.scale);
	checkRect.w = spriteRect.w*FLAG.scale;
	checkRect.h = spriteRect.h*FLAG.scale;

	if(FLAG.pointInRect(clickPoint,checkRect) == true){
		spritesClicked.push(this.name);
	}

	if(spritesClicked.length > 0){
		return true;
	}else{
		return false;
	}
}

FLAGSPRITE.prototype.clickedDecal = function(decal){
	//an array to hold the names of the sprites clicked
	var clickedDecals = [];
	//get the mouse position
	var clickPoint = {x:FLAG.Pointer.mapLoc.x, y:FLAG.Pointer.mapLoc.y};
	var decalFound = false;
	if(decal == null){
		//do nothing, no decal was given
	}else{
		//if the decal is a name
		if(isNaN(decal) == true){
			var numDecals = this.decals.length;
			for(var s=0;s<numDecals;s++){
				if(this.decals[s].name == decal){
					decal = s;
					decalFound = true;
				}
			}
		//if the decal is given as a number
		}else{
			var numDecals = this.decals.length;
			if(decal < numDecals){
				decalFound = true;
			}
		}
	}

	if(decalFound == true){
		//get the position of the decal
		var decalRect = FLAG.Scene.spriteSheets[this.decals[decal].pIndex].tileRects[this.decals[decal].frame];
		if(this.gui == false){
			var decalPoint = {x:this.x+this.decals[decal].x, y:this.y+this.decals[decal].y};
		}else if(this.gui == true){
			var decalPoint = {x:this.x-FLAG.Scene.Map.x+this.decals[decal].x, y:this.y-FLAG.Scene.Map.y+this.decals[decal].y};
		}
		
		//set up the rect to check
		var checkRect = {x:0,y:0,w:0,h:0};
		checkRect.x = decalPoint.x - ((decalRect.w/2)*FLAG.scale);
		checkRect.y = decalPoint.y - ((decalRect.h/2)*FLAG.scale);
		checkRect.w = decalRect.w*FLAG.scale;
		checkRect.h = decalRect.h*FLAG.scale;

		if(FLAG.pointInRect(clickPoint,checkRect) == true){
			clickedDecals.push(this.decals[decal].name);
		}
	}
	if(clickedDecals.length > 0){
		return true;
	}else{
		return false;
	}
}

FLAGSPRITE.prototype.Decal = function(name){
	var numDecals = this.decals.length;
	for(var d=0;d<numDecals;d++){
		if(this.decals[d].name == name){
			return this.decals[d];
		}	
	}
}

FLAGSPRITE.prototype.drag = function(){
	this.x = FLAG.Pointer.mapLoc.x;
	this.y = FLAG.Pointer.mapLoc.y;
}

FLAGSPRITE.prototype.getAnimation = function(){
	return {index:this.animation,name:FLAG.Scene.spriteSheets[this.pIndex].animations[this.animation].name};
}

FLAGSPRITE.prototype.isometricMove = function(speed){
	var speed = speed || 0;
	if(FLAG.arrowUp == true && FLAG.arrowRight == true){
		this.x += speed;
	}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
		this.y -= speed;
	}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
		this.y += speed;
	}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
		this.x -= speed;
	}else{
		if(FLAG.arrowUp == true){
			this.x += speed;
			this.y -= (speed*.5);
		}
		if(FLAG.arrowDown== true){
			this.x -= speed;
			this.y += (speed*.5);
		}
		if(FLAG.arrowRight == true){
			this.x += speed;
			this.y += (speed*.5);
		}
		if(FLAG.arrowLeft == true){
			this.x -= speed;
			this.y -= (speed*.5);
		}
	}
}

FLAGSPRITE.prototype.linearMove = function(speed){
	var speed = speed || 0;
	if(FLAG.arrowUp == true && FLAG.arrowRight == true){
		this.x += speed;
		this.y -= (speed*.5);
	}else if(FLAG.arrowUp == true && FLAG.arrowLeft == true){
		this.x -= speed;
		this.y -= (speed*.5);
	}else if(FLAG.arrowDown== true && FLAG.arrowRight == true){
		this.x += speed;
		this.y += (speed*.5);
	}else if(FLAG.arrowDown== true && FLAG.arrowLeft == true){
		this.x -= speed;
		this.y += (speed*.5);
	}else{
		if(FLAG.arrowUp == true){
			this.y -= speed;
		}
		if(FLAG.arrowDown== true){
			this.y += speed;
		}
		if(FLAG.arrowRight == true){
			this.x += speed;
		}
		if(FLAG.arrowLeft == true){
			this.x -= speed;
		}
	}
}

FLAGSPRITE.prototype.play = function(){
	this.playing = true;
}

FLAGSPRITE.prototype.removeDecal = function(decal){
	if(decal == null){
		//do nothing, no decal name given
	}else{
		var decalsToKeep = [];
		//if the decal is given as a name
		if(isNaN(decal) == true){
			//find the name of the decal
			var numDecals = this.decals.length;
			for(var s=0;s<numDecals;s++){
				if(this.decals[s].name != decal){
					decalsToKeep.push(this.decals[s]);
				}
			}
		//decal given as number
		}else{
			var numDecals = this.decals.length;
			for(var s=0;s<numDecals;s++){
				if(s != decal){
					decalsToKeep.push(this.decals[s]);
				}
			}
		}

		this.decals = [];
		this.decals = decalsToKeep;
	}
}

FLAGSPRITE.prototype.setAnimation = function(animation){
	var animationFound = -1;
	//if animation is given as null
	if(animation == null){
		//set the animation to null
		this.animation = null;
	}
	//if the animation is given as a name
	if(isNaN(animation) == true){
		//find the number that matches the name in the sprites
		var numAnimations = FLAG.Scene.spriteSheets[this.pIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			if(animation == FLAG.Scene.spriteSheets[this.pIndex].animations[a].name){
				animationFound = a;
			}
		}
	//if the animation is given as a number
	}else{
		var numAnimations = FLAG.Scene.spriteSheets[this.pIndex].animations.length;
		if(animation < numAnimations){
			animationFound = animation;
		}
	}
	
	if(animationFound != -1 && this.animation != animationFound){
		this.frame = FLAG.Scene.spriteSheets[this.pIndex].animations[animationFound].startFrame;
		this.animation = animationFound;
	}
	
	//reset the amount of loops, since the animation was just changed
	this.loops = 0;
}

FLAGSPRITE.prototype.setFrame = function(frame){
	//if an animation exists
	if(this.animation != null){
		//if the frame is given as a name
		if(isNaN(frame) == true){
			if(frame == "startFrame"){
				this.frame = Number(FLAG.Scene.spriteSheets[this.pIndex].animations[this.animation].startFrame);
			}else if(frame == "endFrame"){
				this.frame = Number(FLAG.Scene.spriteSheets[this.pIndex].animations[this.animation].endFrame);
			}
		//if frame is given as number
		}else{
			if(frame > Number(FLAG.Scene.spriteSheets[this.pIndex].animations[this.animation].endFrame)){
				this.frame = Number(FLAG.Scene.spriteSheets[this.pIndex].animations[this.animation].endFrame);
			}
		}
	//if no animation exists
	}else{
		//does frame exist
		if(frame < (FLAG.Scene.spriteSheets[this.pIndex].tilesWide * FLAG.Scene.spriteSheets[this.pIndex].tilesHigh)){
			this.frame = frame;
		}
	}
}

FLAGSPRITE.prototype.stop = function(){
	this.playing = false;	
	//reset the amount of loops, since the animation has stopped
	this.loops = 0;
}

FLAGSPRITE.prototype.tilePath = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.tileOn.col;};
	if(!p.hasOwnProperty('timeStep')){p.timeStep = 1;};
	if(!p.hasOwnProperty('diagonals')){p.diagonals = false;};
	p.end = {row:p.row,col:p.col};

	var start = {row:this.tileOn.row, col:this.tileOn.col};
	var end = p.end;
	var timeStep = p.timeStep;
	if(end.row < FLAG.Scene.Map.tilesHigh && end.col < FLAG.Scene.Map.tilesWide && end.row >= 0 && end.col >= 0 && FLAG.Scene.walkableTiles[end.row][end.col] != 0){
		if(start.row == end.row && start.col == end.col){
			//already on target tile
		}else{
			this.targetVec = {x:0,y:0};
			this.timeStep = timeStep;
			this.step = {x:0,y:0};
			this.aStarResult = [];	
			var graph = new Graph(FLAG.Scene.walkableTiles);
			var start = graph.nodes[start.row][start.col];
			var end = graph.nodes[end.row][end.col];
			this.aStarResult = astar.search(graph.nodes, start, end, p.diagonals);
			// result is an array containing the shortest path
			if(this.aStarResult.length > 0){
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.targetVec.x = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x+(FLAG.Scene.Map.tileWidth/2));
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2));
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.targetVec.x = FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2));
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}

				this.step.x = (this.targetVec.x - this.x)/(this.timeStep);
				this.step.y = (this.targetVec.y - this.y)/(this.timeStep);
			}
		}
	}		
}

FLAGSPRITE.prototype.toTile = function(p){
	if(!p.hasOwnProperty('row')){p.row = this.tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.tileOn.col;};
	p.tile = {row:p.row,col:p.col};

	var tile = p.tile;
	var targetVec = {x:0,y:0};
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		targetVec.x = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].x+(FLAG.Scene.Map.tileWidth/2));
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2));
	}else if(FLAG.Scene.Map.type == "isometric"){
		targetVec.x = FLAG.Scene.Map.gridPoints[tile.row][tile.col].x;
		targetVec.y = (FLAG.Scene.Map.gridPoints[tile.row][tile.col].y+(FLAG.Scene.Map.tileHeight/2));
	}
	this.x = targetVec.x;
	this.y = targetVec.y;
}

FLAGSPRITE.prototype.travelTilePath = function(){
	if(this.aStarResult != null){
		//step between tiles
		var setX = 0;
		var setY = 0;
		
		//moving left
		if(this.step.x < 0){
			//if the next step is past the target	
			if((this.x + this.step.x) < this.targetVec.x){
				//set it to the target
				setX = this.targetVec.x;
			}else{
				//take a step
				setX = this.x + this.step.x;
			}
			
		//moving right
		}else if(this.step.x > 0){
			//if the next step is past the target	
			if((this.x + this.step.x) > this.targetVec.x){
				//set it to the target
				setX = this.targetVec.x;
			}else{
				//take a step
				setX = this.x + this.step.x;
			}
			
		//horizontally correct
		}else if(this.step.x == 0){
			//set it to the target
			setX = this.targetVec.x;
		}
		
		//moving up
		if(this.step.y < 0){
			//if the next step is past the target	
			if((this.y + this.step.y) < this.targetVec.y){
				//set it to the target
				setY = this.targetVec.y;
			}else{
				//take a step
				setY = this.y + this.step.y;
			}
		//moving down	
		}else if(this.step.y > 0){
			//if the next step is past the target	
			if((this.y + this.step.y) > this.targetVec.y){
				//set it to the target
				setY = this.targetVec.y;
			}else{
				//take a step
				setY = this.y + this.step.y;
			}
			
		//vertically correct
		}else if(this.step.y == 0){
			//set it to the target
			setY = this.targetVec.y;
		}
		
		this.x = setX;
		this.y = setY;
		
		//reached tile?
		if(setX == this.targetVec.x && setY == this.targetVec.y){
			this.aStarResult.splice(0,1);
			//new tile target?
			if(this.aStarResult.length > 0){
				if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
					this.targetVec.x = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x+(FLAG.Scene.Map.tileWidth/2));
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2));
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}else if(FLAG.Scene.Map.type == "isometric"){
					this.targetVec.x = FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].x;
					this.targetVec.y = (FLAG.Scene.Map.gridPoints[this.aStarResult[0].x][this.aStarResult[0].y].y+(FLAG.Scene.Map.tileHeight/2));
					this.tileNext = {row:this.aStarResult[0].x,col:this.aStarResult[0].y};
				}
				
				this.step.x = (this.targetVec.x - this.x)/(this.timeStep);
				this.step.y = (this.targetVec.y - this.y)/(this.timeStep);
			//no more tile targets
			}else{
				this.aStarResult = null;
				this.x = this.targetVec.x;
				this.y = this.targetVec.y;
				this.tileNext = null;
			}
		}
	}
}

FLAGSPRITE.prototype.tweenAlpha = function(p){
	if(typeof p != "object"){var p={alpha:1,duration:0,ease:FLAG.linear,onComplete:null};};
	if(!p.hasOwnProperty('alpha')){p.alpha = 1;};
	if(!p.hasOwnProperty('duration')){p.duration = 0;};
	if(!p.hasOwnProperty('ease')){p.ease = FLAG.linear;};
	if(!p.hasOwnProperty('onComplete')){p.onComplete = null;};
	FLAG.Tween(this, "alpha", p.alpha, p.duration, p.ease, p.onComplete);
}

FLAGSPRITE.prototype.tweenPosition = function(p){
	if(typeof p != "object"){var p={x:0,y:0,duration:0,ease:FLAG.linear,onComplete:null};};
	if(!p.hasOwnProperty('x')){p.x = this.x;};
	if(!p.hasOwnProperty('y')){p.y = this.y;};
	if(!p.hasOwnProperty('duration')){p.duration = 0;};
	if(!p.hasOwnProperty('ease')){p.ease = FLAG.linear;};
	if(!p.hasOwnProperty('onComplete')){p.onComplete = null;};

	//X TWEEN
	FLAG.Tween(this, "x", p.x, p.duration, p.ease);
	//Y TWEEN
	FLAG.Tween(this, "y", p.y, p.duration, p.ease, p.onComplete);
}

FLAGSPRITE.prototype.tweenToTile = function(p){
	if(typeof p != "object"){var p={row:this.tileOn.row,col:this.tileOn.col,duration:0,ease:FLAG.linear,onComplete:null};};
	if(!p.hasOwnProperty('row')){p.row = this.tileOn.row;};
	if(!p.hasOwnProperty('col')){p.col = this.tileOn.col;};
	if(!p.hasOwnProperty('duration')){p.duration = 0;};
	if(!p.hasOwnProperty('ease')){p.ease = FLAG.linear;};
	if(!p.hasOwnProperty('onComplete')){p.onComplete = null;};

	var targetTile = {row:p.row,col:p.col};
	var targetPosition = {x:0,y:0};
	if(FLAG.Scene.Map.type == "orthogonal" || FLAG.Scene.Map.type == "hexagonal"){
		targetPosition.x = (FLAG.Scene.Map.gridPoints[targetTile.row][targetTile.col].x+(FLAG.Scene.Map.tileWidth/2));
		targetPosition.y = (FLAG.Scene.Map.gridPoints[targetTile.row][targetTile.col].y+(FLAG.Scene.Map.tileHeight/2));
	}else if(FLAG.Scene.Map.type == "isometric"){
		targetPosition.x = FLAG.Scene.Map.gridPoints[targetTile.row][targetTile.col].x;
		targetPosition.y = (FLAG.Scene.Map.gridPoints[targetTile.row][targetTile.col].y+(FLAG.Scene.Map.tileHeight/2));
	}

	//X TWEEN
	FLAG.Tween(this, "x", targetPosition.x, p.duration, p.ease);
	//Y TWEEN
	FLAG.Tween(this, "y", targetPosition.y, p.duration, p.ease, p.onComplete);
}

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGSPRITE




//FLAGTILEDOBJECT
//Constructor for the FLAGTILEDOBJECT class
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGTILEDOBJECT(name,pIndex,layer,row,col,animation,frame){
	//PROPERTIES
	this.animation = animation;
	this.col = col;
	this.decals = [];
	this.frame = frame || 0;
	this.layer = layer;
	this.loop = true;
	this.loopCount = null;
	this.loops = 0;
	this.name = name;
	this.playing = true;
	this.row = row;
	this.pIndex = pIndex;
}

FLAGTILEDOBJECT.prototype.getAnimation = function(){
	return {index:this.animation,name:FLAG.Scene.tiledObjectSheets[this.pIndex].animations[this.animation].name};
}

FLAGTILEDOBJECT.prototype.play = function(){
	this.playing = true;
}

FLAGTILEDOBJECT.prototype.setAnimation = function(animation){
	var animationFound = -1;
	//if animation is given as null
	if(animation == null){
		//set the animation to null
		this.animation = null;
	}
	//if the animation is given as a name
	if(isNaN(animation) == true){
		//find the number that matches the name in the tiledObjectSheets
		var numAnimations = FLAG.Scene.tiledObjectSheets[this.pIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			if(animation == FLAG.Scene.tiledObjectSheets[this.pIndex].animations[a].name){
				animationFound = a;
			}
		}
	//if the animation is given as a number
	}else{
		var numAnimations = FLAG.Scene.tiledObjectSheets[this.pIndex].animations.length;
		if(animation < numAnimations){
			animationFound = animation;
		}
	}
	
	if(animationFound != -1 && this.animation != animationFound){
		this.frame = Number(FLAG.Scene.tiledObjectSheets[this.pIndex].animations[animationFound].startFrame);
		this.animation = animationFound;
	}
}

FLAGTILEDOBJECT.prototype.setFrame = function(frame){
	//if an animation exists
	if(this.animation != null){
		//if the frame is given as a name
		if(isNaN(frame) == true){
			if(frame == "startFrame"){
				this.frame = Number(FLAG.Scene.tiledObjectSheets[this.pIndex].animations[this.animation].startFrame);
			}else if(frame == "endFrame"){
				this.frame = Number(FLAG.Scene.tiledObjectSheets[this.pIndex].animations[this.animation].endFrame);
			}
		//if frame is given as number
		}else{
			if(frame > Number(FLAG.Scene.tiledObjectSheets[this.pIndex].animations[this.animation].endFrame)){
				this.frame = Number(FLAG.Scene.tiledObjectSheets[this.pIndex].animations[this.animation].endFrame);
			}
		}
	//if no animation exists
	}else{
		//does frame exist
		if(frame < (FLAG.Scene.tiledObjectSheets[this.pIndex].framesWide * FLAG.Scene.tiledObjectSheets[this.pIndex].framesHigh)){
			this.frame = frame;
		}
	}
}

FLAGTILEDOBJECT.prototype.stop = function(){
	this.playing = false;
	//reset the amount of loops, since the animation has stopped
	this.loops = 0;
}

//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//FLAGTILEDOBJECT




//FLAGTILESPRITE
//Constructor for the FLAGTILESPRITE class
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
function FLAGTILESPRITE(name,pIndex,row,col,animation,frame,layer,playing){
	//PROPERTIES
	this.animation = animation;
	this.col = col;
	this.frame = frame;
	this.layer = layer;
	this.loop = true;
	this.loopCount = null;
	this.loops = 0;
	this.name = name;
	this.pIndex = pIndex;
	this.playing = playing || true;
    this.row = row;
}

FLAGTILESPRITE.prototype.getAnimation = function(){
	return {index:this.animation,name:FLAG.Scene.tileSheets[this.pIndex].animations[this.animation].name};
}

FLAGTILESPRITE.prototype.play = function(){
	this.playing = true;
}

FLAGTILESPRITE.prototype.setAnimation = function(animation){
	var animationFound = -1;
	//if animation is given as null
	if(animation == null){
		//set the animation to null
		this.animation = null;
	}
	//if the animation is given as a name
	if(isNaN(animation) == true){
		//find the number that matches the name in the tileSheets
		var numAnimations = FLAG.Scene.tileSheets[this.pIndex].animations.length;
		for(var a=0;a<numAnimations;a++){
			if(animation == FLAG.Scene.tileSheets[this.pIndex].animations[a].name){
				animationFound = a;
			}
		}
	//if the animation is given as a number
	}else{
		var numAnimations = FLAG.Scene.tileSheets[this.pIndex].animations.length;
		if(animation < numAnimations){
			animationFound = animation;
		}
	}
	
	if(animationFound != -1 && this.animation != animationFound){
		this.frame = Number(FLAG.Scene.tileSheets[this.pIndex].animations[animationFound].startFrame);
		this.animation = animationFound;
	}
}

FLAGTILESPRITE.prototype.setFrame = function(frame){
	//if an animation exists
	if(this.animation != null){
		//if the frame is given as a name
		if(isNaN(frame) == true){
			if(frame == "startFrame"){
				this.frame = Number(FLAG.Scene.tileSheets[this.pIndex].animations[this.animation].startFrame);
			}else if(frame == "endFrame"){
				this.frame = Number(FLAG.Scene.tileSheets[this.pIndex].animations[this.animation].endFrame);
			}
		//if frame is given as number
		}else{
			if(frame > Number(FLAG.Scene.tileSheets[this.pIndex].animations[this.animation].endFrame)){
				this.frame = Number(FLAG.Scene.tileSheets[this.pIndex].animations[this.animation].endFrame);
			}
		}
	//if no animation exists
	}else{
		//does frame exist
		if(frame < (FLAG.Scene.tileSheets[this.pIndex].framesWide * FLAG.Scene.tileSheets[this.pIndex].framesHigh)){
			this.frame = frame;
		}
	}
}

FLAGTILESPRITE.prototype.stop = function(){
	this.playing = false;
	//reset the amount of loops, since the animation has stopped
	this.loops = 0;
}


//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGTILESPRITE



//FLAGWIND
//Constructor for the FLAGWIND class
//adds methods to existing WIND objects
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

function FLAGWIND(){
	this.metrics = [];
	this.events = [];
	this.eGroups = [];
	this.decimals = 2;
	this.Player = {
		metrics:[],
		history:[]
	};
}

FLAGWIND.prototype.initPlayer = function(){

	this.Player.metrics = [];
	this.Player.history = [];

	//count the number of metrics
	var numMetrics = this.metrics.length;
	
	//initialize all Player's metrics
	for(var m=0;m<numMetrics;m++){
		this.Player.metrics.push({
			name:this.metrics[m].name,
			value:Number(this.metrics[m].value)
		});
		
		//are there extras?
		if(this.metrics[m].extras != undefined){
			
			//are the extras an object
			if(typeof this.metrics[m].extras == "object"){
			
				//makes a clone of the object
				this.Player.metrics[m].extras = JSON.parse(JSON.stringify(this.metrics[m].extras));
			
			}else{
		
				//are the extras a number
				if(isNaN(this.metrics[m].extras) != true){
				
					this.Player.metrics[m].extras = Number(this.metrics[m].extras);
			
				//must be a string then
				}else{
			
					this.Player.metrics[m].extras = String(this.metrics[m].extras);
				}
			}
		}
	}
}

FLAGWIND.prototype.rerunHistory = function(history){		
	//reset the Player's data
	this.initPlayer();
	
	var lengthOfHistory = history.length;	
	//run every event in history
	for(var h=0;h<lengthOfHistory;h++){			
		
		//run recurring effects from previous turns
		this.applyRecurringEffects();		
		
		//is the event a multiple selection, and therefore have multiple effects
		if(this.events[history[h].evt].type == 2){
			var numEffects = history[h].opt.length;
			for(var o=0;o<numEffects;o++){
				//run the new event
				this.applyEffects({evt:history[h].evt,opt:history[h].opt[o],turn:h,otr:0});
			}
		}else{
			//run the new event
			this.applyEffects({evt:history[h].evt,opt:history[h].opt,turn:h,otr:0});
		}

		//add the new event to the history
		this.Player.history.push({evt:history[h].evt,opt:history[h].opt,extras:history[h].extras});	
	}	
}

FLAGWIND.prototype.runEvent = function(p){
	
	if(p.evt != undefined){
	
		//reasons why evt could not be run
		p.errors = [];
	
		//is there an option?
		if(p.opt == undefined){p.opt = 0;};
		
		this.checkRepeatLimit(p);
		
		return p.errors;
		
	}
}


FLAGWIND.prototype.checkRepeatLimit = function(p){

	//no repeat limit
	if(this.events[p.evt].repeatLimit == undefined){
	
		this.checkPrerequisite(p);
	
	}else{
		var eventRepeatLimit = this.events[p.evt].repeatLimit;
		var numTurns = this.Player.history.length;
		var numEventOccured = 0;
		if(numTurns > 0 && eventRepeatLimit > 0){
			for(var e=0;e<numTurns;e++){
				if(this.Player.history[e].evt == p.evt){
					numEventOccured += 1;
		};};};
	
		if(numEventOccured < eventRepeatLimit || eventRepeatLimit == 0){
	
			this.checkPrerequisite(p);
		
		}else{
			
			p.errors.push("The repeat limit for this event has been reached.");
		}
	}
};


FLAGWIND.prototype.checkPrerequisite = function(p){

	var errors = [];
	
	//no prerequisites
	if(this.events[p.evt].prerequisites == undefined){
	
		//run recurring effects from previous turns
		this.applyRecurringEffects();
	
		//run the new event
		var turn = this.Player.history.length;
		
		//is the event a multiple selection, and therefore have multiple effects
		if(this.events[p.evt].type == 2){
			var numEffects = p.opt.length;
			for(var o=0;o<numEffects;o++){
				this.applyEffects({evt:p.evt,opt:p.opt[o],turn:turn,otr:0});
			}
		}else{
			this.applyEffects({evt:p.evt,opt:p.opt,turn:turn,otr:0});
		}
	
		//add the new event to the history
		this.Player.history.push({evt:p.evt,opt:p.opt});	
			
	}else{
	
		var numPrerequisites = this.events[p.evt].prerequisites.length;
		
		//0 if not met, 1 if met
		var prerequisitesMet = [];
		for(var pre=0;pre<numPrerequisites;pre++){
			prerequisitesMet.push(0);
		}
		
		var numTurns = this.Player.history.length;
		for(var e=0;e<numTurns;e++){
			for(var pre=0;pre<numPrerequisites;pre++){
				//is the prerequisite event in the history
				if(this.Player.history[e].evt == this.events[p.evt].prerequisites[pre]){
					//does it need to match the amount of times the event itself has happened
					if(this.events[p.evt].prerequisiteMatchAmounts[pre] == true){
						var lengthOfHistory = this.Player.history.length;
						var numTimesEvt = 0;
						var numTimesPrereq = 0;
						for(var h=0;h<lengthOfHistory;h++){	
							if(this.Player.history[h].evt == p.evt){
								numTimesEvt += 1;
							}
							if(this.Player.history[h].evt == this.events[p.evt].prerequisites[pre]){
								numTimesPrereq += 1;
							}
						}
												
						if(numTimesEvt < numTimesPrereq){
							prerequisitesMet[pre] = 1;
						}
					
					//does not need to match amounts
					}else{
						prerequisitesMet[pre] = 1;
					}
				}
			}
		}		
	
		var arePrerequisitesMet = true;
		for(var pre=0;pre<numPrerequisites;pre++){
			if(prerequisitesMet[pre] == 0){
				arePrerequisitesMet = false;
		};};
	
		if(arePrerequisitesMet == true){
	
			//run recurring effects from previous turns
			this.applyRecurringEffects();
		
			//run the new event
			var turn = this.Player.history.length;
			
			//is the event a multiple selection, and therefore have multiple effects
			if(this.events[p.evt].type == 2){
				var numEffects = p.opt.length;
				for(var o=0;o<numEffects;o++){
					this.applyEffects({evt:p.evt,opt:p.opt[o],turn:turn,otr:0});
				}
			}else{
				this.applyEffects({evt:p.evt,opt:p.opt,turn:turn,otr:0});
			}
		
			//add the new event to the history
			this.Player.history.push({evt:p.evt,opt:p.opt});
		
		}else{
	
			p.errors.push("The prerequisites for this event have not been met.");
		}
	}
};

FLAGWIND.prototype.applyRecurringEffects = function(){
	var numTurns = this.Player.history.length;
	if(numTurns > 0){
		for(var t=0;t<numTurns;t++){
			//is the event a multiple selection, and therefore have multiple effects
			if(this.events[this.Player.history[t].evt].type == 2){
				var numEffects = this.Player.history[t].opt.length;
				for(var o=0;o<numEffects;o++){
					this.applyEffects({evt:this.Player.history[t].evt,opt:this.Player.history[t].opt[o],turn:t,otr:1});
				}
			}else{
				this.applyEffects({evt:this.Player.history[t].evt,opt:this.Player.history[t].opt,turn:t,otr:1});
			}			
		}
	}
};

FLAGWIND.prototype.applyEffects = function(p){

	var numMetrics = this.metrics.length;
	
	//holds the array(s) that will effect the metrics
	var effectsArrays = [];
	
	//only used to hold the two values for slider events
	var values = [];
	
	//TYPE OF EVENT AND WHICH OPTION
	switch(this.events[p.evt].type){
	
		//happenstance
		//there is only one possible overall effect, so the index is 0
		case 0:
			//one time
			if(p.otr == 0){
				effectsArrays = [this.events[p.evt].effects[0].ot];
			//recurring
			}else if(p.otr == 1){
				effectsArrays = [this.events[p.evt].effects[0].r];
			};
			break;
			
		//multiple choice
		//there are any number of possible overall effects, so we use index of p.opt
		case 1:
			//one time
			if(p.otr == 0){
				//which option
				effectsArrays = [this.events[p.evt].effects[p.opt].ot];
			//recurring
			}else if(p.otr == 1){
				//which option
				effectsArrays = [this.events[p.evt].effects[p.opt].r];
			};
			break;
			
		//multiple selection
		//there are any number of possible overall effects, so we use index of p.opt
		case 2:
			//one time
			if(p.otr == 0){
				//which option
				effectsArrays = [this.events[p.evt].effects[p.opt].ot];
			//recurring
			}else if(p.otr == 1){
				//which option
				effectsArrays = [this.events[p.evt].effects[p.opt].r];
			};
			break;
			
		//slider
		//there is two possible overall effects, so we must include the indexes 0 and 1
		case 3:
			//one time
			if(p.otr == 0){
				//need both effects
				effectsArrays = [this.events[p.evt].effects[0].ot,this.events[p.evt].effects[1].ot];
			//recurring
			}else if(p.otr == 1){
				//need both effects
				effectsArrays = [this.events[p.evt].effects[0].r,this.events[p.evt].effects[1].r];
			};
			
			values.push(this.events[p.evt].effects[0].value);
			values.push(this.events[p.evt].effects[1].value);
			break;		
	};
	
	//hold temp values for the metrics
	var tempValues = [];
	for(var m=0;m<numMetrics;m++){
		
		//EXTRAS
		//are there extras with this metric
		if(this.Player.metrics[m].extras != undefined){
			
			//if using an extra called byTurn, the length of the player's history is used as the counter through the extra array
			if(this.Player.metrics[m].extras.byTurn != undefined && this.Player.metrics[m].extras.byTurn.length > 0){
		
				var lengthOfByTurn = this.Player.metrics[m].extras.byTurn.length;
			
				//if there is not enough values in the byTurn
				if(lengthOfByTurn <= p.turn){
			
					//is a loop set
					if(this.Player.metrics[m].extras.loop != undefined && this.Player.metrics[m].extras.loop == true){
				
						//loop back around to get value
						var turnValue = p.turn % lengthOfByTurn;
						this.Player.metrics[m].value = Number(this.Player.metrics[m].extras.byTurn[turnValue]);
					
					//no loop has been declared	
					}else{
			
						//use the last value in the byTurn
						this.Player.metrics[m].value = Number(this.Player.metrics[m].extras.byTurn[lengthOfByTurn-1]);
				
					}
				
				//the extra array is long enough
				}else{
					
					//use the length of the history as the counter
					this.Player.metrics[m].value = Number(this.Player.metrics[m].extras.byTurn[p.turn]);
				}
			
			
			//if using another metric as the counter through the extra array
			}else{
				
				var mIndexes = [];
				//is there an extra property the same name as a metric
				for (var key in this.Player.metrics[m].extras) {
					
					//search the metrics, and store the indexes
					for(var em=0;em<numMetrics;em++){
						if(key == this.Player.metrics[em].name){
							mIndexes.push(em);
						}
					}
				}
							
							
				//for each extra that is a metric
				var numMetricExtras = mIndexes.length;
				for(var em=0;em<numMetricExtras;em++){
				
					//use the stored metric indexes to get the name of the metric
					var metricName = this.Player.metrics[mIndexes[em]].name;
				
					//get the length of the extra array
					var lea = this.Player.metrics[m].extras[metricName].length;
					
					//if there is not enough values in the extra array
					if(lea <= this.Player.metrics[mIndexes[em]].value){
						
						//is a loop set
						if(this.Player.metrics[m].extras.loop != undefined && this.Player.metrics[m].extras.loop == true){
						
							//loop back around to get value
							var turnValue = this.Player.metrics[mIndexes[em]].value % lea;
							this.Player.metrics[m].value = Number(this.Player.metrics[m].extras[metricName][turnValue]);
						
						//no loop has been declared	
						}else{
						
							//use the last value
							this.Player.metrics[m].value = Number(this.Player.metrics[m].extras[metricName][lea-1]);
				
						}
						
					//the extra array is long enough
					}else{
						
						//use the metric as a counter
						this.Player.metrics[m].value = Number(this.Player.metrics[m].extras[metricName][this.Player.metrics[mIndexes[em]].value]);
					}
				}
			}
		}
		//END EXTRAS
		
		
		tempValues.push({A:Number(this.Player.metrics[m].value), B:Number(this.Player.metrics[m].value), range:0});
	};		
	
	
	
	//APPLY EFFECTS to TEMP VALUES
	//-----------------------------------------------------------------------------
	
	var numEffectsArrays = effectsArrays.length;
	
	//loop through the effectsArrays
	//happenstance and multiple choice events will have only one effectsArray
	//slider events will have two, so the range of effects can be calculated
	for(var ea = 0; ea<numEffectsArrays; ea++){
	
		//get the number of effects
		if(effectsArrays[ea] != null){var numEffects = effectsArrays[ea].length;}else{numEffects = 0;};
		
		//loop through each effect
		for(var e=0;e<numEffects;e++){
		
			//is the effect an eGroup
			if(effectsArrays[ea][e][0] == 'g'){
			
				//eGroups
				//[0 - g, 1 - eGroup Index]
				var eGroupNum = effectsArrays[ea][e][1];
				var num_eGroup_Effects = WIND.eGroups[eGroupNum].e.length;
				
				//go through the effects of the eGroup and apply them to the tempValues
				for(var ege=0;ege<num_eGroup_Effects;ege++){
				
					//effects on metrics
					//[0 - metric, 1 - sign, 2 - type, 3 - value]			
		
					//the effect type, num or metric
					switch(WIND.eGroups[eGroupNum].e[ege][2]){
		
						//metric
						case 0:
							//if using the first effectsArray
							//as in happenstance and multiple choice events
							//since there is only one effectsArray in those cases
							if(ea == 0){
					
								//uses a metric value for the effects
								theEffect = Number(tempValues[WIND.eGroups[eGroupNum].e[ege][3]].A);
					
							//if using the second effectsArray
							//as in slider events
							}else if(ea == 1){
				
								theEffect = Number(tempValues[WIND.eGroups[eGroupNum].e[ege][3]].B);
					
							};
							break;	
			
						//number
						case 1:
							var theEffect = Number(WIND.eGroups[eGroupNum].e[ege][3]);
							break;
				
						//compound	
						case 2:
							var timeEventOccured = 0;
							var numTurns = this.Player.history.length;
							if(numTurns > 0){
								for(var t=0;t<numTurns;t++){
									if(this.Player.history[t].evt == p.evt){
										timeEventOccured += 1;
							};};}; 
							theEffect = Number(WIND.eGroups[eGroupNum].e[ege][3]) * timeEventOccured;
							break;
					};
					
					//which metric
					var m = WIND.eGroups[eGroupNum].e[ege][0];
					//apply the effect to tempValues 
					switch(WIND.eGroups[eGroupNum].e[ege][1]){
						case "=":
							if(ea == 0){tempValues[m].A = theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B = theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
							break;
						case "+":
							if(ea == 0){tempValues[m].A += theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B += theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
							break;
						case "-":
							if(ea == 0){tempValues[m].A -= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B -= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
							break;
						case "*":
							if(ea == 0){tempValues[m].A *= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B *= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
							break;
						case "/":
							if(ea == 0){tempValues[m].A /= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B /= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
							break;
					}
				}
			
			//is the effect a direct effect on a metric
			}else{
				
				//effects on metrics
				//[0 - metric, 1 - sign, 2 - type, 3 - value]			
			
				//the effect type, num or metric
				switch(effectsArrays[ea][e][2]){
			
					//metric
					case 0:
						//if using the first effectsArray
						//as in happenstance and multiple choice events
						//since there is only one effectsArray in those cases
						if(ea == 0){
						
							//uses a metric value for the effects
							theEffect = Number(tempValues[effectsArrays[ea][e][3]].A);
						
						//if using the second effectsArray
						//as in slider events
						}else if(ea == 1){
					
							theEffect = Number(tempValues[effectsArrays[ea][e][3]].B);
						
						};
						break;	
				
					//number
					case 1:
						var theEffect = Number(effectsArrays[ea][e][3]);
						break;
					
					//compound	
					case 2:
						var timeEventOccured = 0;
						var numTurns = this.Player.history.length;
						if(numTurns > 0){
							for(var t=0;t<numTurns;t++){
								if(this.Player.history[t].evt == p.evt){
									timeEventOccured += 1;
						};};}; 
						theEffect = Number(effectsArrays[ea][e][3]) * timeEventOccured;
						break;
				};
				
				//which metric
				var m = effectsArrays[ea][e][0];
				//apply the effect to tempValues 
				switch(effectsArrays[ea][e][1]){
					case "=":
						if(ea == 0){tempValues[m].A = theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B = theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
						break;
					case "+":
						if(ea == 0){tempValues[m].A += theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B += theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
						break;
					case "-":
						if(ea == 0){tempValues[m].A -= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A); }else if(ea == 1){tempValues[m].B -= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
						break;
					case "*":
						if(ea == 0){tempValues[m].A *= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B *= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
						break;
					case "/":
						if(ea == 0){tempValues[m].A /= theEffect; tempValues[m].A = this.checkNeg(m,tempValues[m].A);}else if(ea == 1){tempValues[m].B /= theEffect; tempValues[m].B = this.checkNeg(m,tempValues[m].B);};
						break;
				}
			}
		}
	}

	//-----------------------------------------------------------------------------
	//END EFFECTS to TEMP VALUES
	
	
	//APPLY TEMP VALUES to PLAYER METRICS
	//-----------------------------------------------------------------------------
	
	//FOR HAPPENSTANCE, MULTIPLE CHOICE and MULTIPLE SELECTION EVENTS
	if(this.events[p.evt].type == 0 || this.events[p.evt].type == 1 || this.events[p.evt].type == 2){	
		
		for(var m=0;m<numMetrics;m++){
			
			//EXTRAS
			//are there extras that should be effected by the event
			if(this.Player.metrics[m].extras != undefined){
			
				//is there an extra called byTurn, the length of the player's history is used as the counter through the extra array
				if(this.Player.metrics[m].extras.byTurn != undefined && this.Player.metrics[m].extras.byTurn.length > 0){
					
					//get the change 
					var changeInMetric = tempValues[m].A - this.Player.metrics[m].value;
					
					//length of extra array
					var lea = this.Player.metrics[m].extras.byTurn.length;
					
					for(var a=0;a<lea;a++){
					
						//set to decimals
						changeInMetric = Number(changeInMetric.toFixed(this.decimals));
						
						//apply the change to the values in the extra array
						this.Player.metrics[m].extras.byTurn[a] += changeInMetric;
					}
					
				
				//are there extras named as metrics
				}else{
					
					//is there an extra property the same name as a metric
					for (var key in this.Player.metrics[m].extras) {
				
						//search the metrics, and store the indexes
						var mIndexes = [];
						for(var em=0;em<numMetrics;em++){
							if(key == this.Player.metrics[em].name){
								mIndexes.push(em);
							}
						}
					}
							
					//for each extra that is a metric
					var numMetricExtras = mIndexes.length;
					for(var em=0;em<numMetricExtras;em++){
						
						//get the change 
						var changeInMetric = tempValues[m].A - this.Player.metrics[m].value;
						
						//use the stored metric indexes to get the name of the metric
						var metricName = this.Player.metrics[mIndexes[em]].name;
					
						//length of extra array
						var lea = this.Player.metrics[m].extras[metricName].length;
						
						for(var a=0;a<lea;a++){
					
							//set to decimals
							changeInMetric = Number(changeInMetric.toFixed(this.decimals));
						
							//apply the change to the values in the extra array
							this.Player.metrics[m].extras[metricName][a] += changeInMetric;
						}
					}				
				}
			}
			//END EXTRAS
			
			//set to decimals
			tempValues[m].A = Number(tempValues[m].A.toFixed(this.decimals));
			
			//check if the result of the effects makes the metric negative
			//and if the metric allows negative values
			if(tempValues[m].A < 0 && this.metrics[m].neg == false){
				
				//effect to the player's metric
				this.Player.metrics[m].value = 0;	
			
			}else{
			
				//effect to the player's metric
				this.Player.metrics[m].value = tempValues[m].A;
			}
		};	
		
	//FOR SLIDER EVENTS
	}else if(this.events[p.evt].type == 3){
	
		//get percentage of slide
		var range = values[1] - values[0];
		
		//in a slider event the p.opt will be a number between the two values
		//where the slider was positioned
		var slideValueFromAValue = p.opt - values[0];		
		var percentageOfSlide = Math.round(((slideValueFromAValue*100)/range));
		
		for(var m=0;m<numMetrics;m++){
			//get the range between the A and B effects			
			var changeFullLeft= tempValues[m].A - this.Player.metrics[m].value;
			var changeFullRight = tempValues[m].B - this.Player.metrics[m].value;
			var totalAmountofChange = changeFullRight - changeFullLeft;
			
			//the percentage of the slider determines how much of the total amount of change to use
			//add it to the amount of change that would have happen if the slider was all the way left, in case the change was taking place across zero
			tempValues[m].range = changeFullLeft + (totalAmountofChange * (percentageOfSlide/100));
			
			//EXTRAS
			//are there extras that should be effected by the event
			if(this.Player.metrics[m].extras != undefined){
			
				//is there an extra called byTurn, the length of the player's history is used as the counter through the extra array
				if(this.Player.metrics[m].extras.byTurn != undefined && this.Player.metrics[m].extras.byTurn.length > 0){
				
					//get the change 
					var changeInMetric = tempValues[m].range;
					
					//length of extra array
					var lea = this.Player.metrics[m].extras.byTurn.length;
					
					for(var a=0;a<lea;a++){
					
						//set to decimals
						changeInMetric = Number(changeInMetric.toFixed(this.decimals));
						
						//apply the change to the values in the extra array
						this.Player.metrics[m].extras.byTurn[a] += changeInMetric;
					}
					
			//are there extras named as metrics
			}else{
					
					//is there an extra property the same name as a metric
					for (var key in this.Player.metrics[m].extras) {
				
						//search the metrics, and store the indexes
						var mIndexes = [];
						for(var em=0;em<numMetrics;em++){
							if(key == this.Player.metrics[em].name){
								mIndexes.push(em);
							}
						}
					}
							
					//for each extra that is a metric
					var numMetricExtras = mIndexes.length;
					for(var em=0;em<numMetricExtras;em++){
						
						//get the change 
						var changeInMetric = tempValues[m].range;
						
						//use the stored metric indexes to get the name of the metric
						var metricName = this.Player.metrics[mIndexes[em]].name;
					
						//length of extra array
						var lea = this.Player.metrics[m].extras[metricName].length;
						
						for(var a=0;a<lea;a++){
					
							//set to decimals
							changeInMetric = Number(changeInMetric.toFixed(this.decimals));
						
							//apply the change to the values in the extra array
							this.Player.metrics[m].extras[metricName][a] += changeInMetric;
						}
					}				
				}
			}
			//END EXTRAS			
			
			//set to decimals
			tempValues[m].range = Number(tempValues[m].range.toFixed(this.decimals));
						
			//check if the result of the effects makes the metric negative
			//and if the metric allows negative values
			var result = Number(this.Player.metrics[m].value + tempValues[m].range);
			if(result < 0 && this.metrics[m].neg == false){
			
				//effect to the player's metric
				this.Player.metrics[m].value = 0;	
				
			}else{
			
				//effect to the player's metric
				this.Player.metrics[m].value += tempValues[m].range;
			}
		}
	}
	
	//-----------------------------------------------------------------------------
	//END EFFECTS to PLAYER METRICS
}

FLAGWIND.prototype.checkNeg = function(whichMetric, currentValue){
	
	var value = Number(currentValue);
	
	//check if the result of the effects makes the metric negative
	//and if the metric allows negative values
	if(value < 0 && this.metrics[whichMetric].neg == false){
		value = 0;	
	}
	
	return value;
}
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAGWIND



//FLAG INITIALIZE
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
var FLAG = {};
window.onload = function(){	

	//DOM SETUP
	//--------------------------------------
	switch(POLE.display.fit){
		case "static":
			//set the width and height of the game
			var win_width = POLE.display.w;
			var win_height = POLE.display.h;
			break;
		case "window":
			//get the width and height of the device
			var win_width = window.innerWidth;
			var win_height = window.innerHeight;
			break;
	}

	var game = document.getElementById('game');
	var canvas = document.getElementById('canvas');
	var gui = document.getElementById('gui');
	var glass = document.getElementById('glass');
	
	//--------------------------------------
	//END DOM INITIALIZE
	
	//WIND OBJECT INITIALIZE
	//--------------------------------------
	if(window['WIND'] == undefined){
		WIND = new FLAGWIND();
	}else{
		var tempWIND = new FLAGWIND();
		if(WIND.metrics != undefined){tempWIND.metrics = WIND.metrics;};
		if(WIND.events != undefined){tempWIND.events = WIND.events;};
		if(WIND.eGroups != undefined){tempWIND.eGroups = WIND.eGroups;};
		if(WIND.decimals != undefined){tempWIND.decimals = WIND.decimals;};
		WIND = tempWIND;
		tempWIND = null;
	}
	//--------------------------------------
	//END WIND OBJECT INITIALIZE
	
	//FLAG OBJECT INITIALIZE
	//--------------------------------------
	
	if(game != null && canvas != null){
		//establish the width and height of the canvas
		canvas.width = win_width;
		canvas.height = win_height;
	
		//load FLAG 
		FLAG = new FLAGENGINE(game,canvas,gui,glass);
		
		//FPS
		if(POLE.fps.useRAF != undefined){
			FLAG.FPS.useRAF = POLE.fps.useRAF;
		}
		if(POLE.fps.set != undefined){
			FLAG.FPS.set = POLE.fps.set;
		}
		if(POLE.fps.sprites != undefined){
			FLAG.FPS.sprites = POLE.fps.sprites;
		}
		
		//IMAGE BUFFER
		if(POLE.display.imageBuffer == undefined){
			POLE.display.imageBuffer = false;
		}

		//SCALE GAME
		setTimeout(function(){FLAG.scaleGame();},0);		
				
		//WINDOW EVENTS
		//--------------------------------------
		//Listen for mouse events
		window.addEventListener('keydown', FLAG.keyDownHandler.bind(FLAG), false);
		window.addEventListener('keyup', FLAG.keyUpHandler.bind(FLAG), false);
		window.addEventListener('mousedown', FLAG.mouseDown.bind(FLAG), true);
		window.addEventListener('mousemove', FLAG.mouseMove.bind(FLAG), true);
		window.addEventListener('mouseout', FLAG.mouseOut.bind(FLAG), true);
		window.addEventListener('mouseup', FLAG.mouseUp.bind(FLAG), true);
		window.addEventListener('mousewheel', FLAG.mouseWheel.bind(FLAG), true);
		//mousewheel for firefox
		window.addEventListener('DOMMouseScroll', FLAG.mouseWheel.bind(FLAG), true);
		//Listen for browser resizing
		window.onresize = function() {FLAG.scaleGame();};
		// Listen for orientation changes
		window.addEventListener("orientationchange", function(){setTimeout(function(){FLAG.scaleGame();},250);}, false);
		//Listen for touch events
		window.addEventListener("touchcancel", FLAG.touchOut.bind(FLAG), true);
		window.addEventListener("touchend", FLAG.touchUp.bind(FLAG), true);
		window.addEventListener("touchmove", FLAG.touchMove.bind(FLAG), true);
		window.addEventListener("touchstart", FLAG.touchDown.bind(FLAG), true);
		//Listen for window focus
		//window.onblur = function() {FLAG.pause();};
		//window.onfocus = function() {FLAG.play();};
		window.normalizeEventOffset = FLAG.normalizeEventOffset;	
		//--------------------------------------
		//END WINDOW EVENTS
		
		//START
		//call the user's start function
		start();
	}else{
		alert("The HTML is not properly formatted to run the FLAG Engine.");
	}
	
	//--------------------------------------
	//END FLAG OBJECT INITIALIZE
	
};
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END FLAG INITIALIZE


//OBJECT PROPERTY CHECK
//Checks if an object has a property
//------------------------------------------------------------------
Object.prototype.hasOwnProperty = function(property) {
    return this[property] !== undefined;
};
//------------------------------------------------------------------
//END OBJECT PROPERTY CHECK


//ASTAR PATHFINDING ALGORITHM
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
var GraphNodeType = { 
    OPEN: 1, 
    WALL: 0
};

// Creates a Graph class used in the astar search algorithm.
function Graph(grid) {
    var nodes = [];

    for (var x = 0; x < grid.length; x++) {
        nodes[x] = [];
        
        for (var y = 0, row = grid[x]; y < row.length; y++) {
            nodes[x][y] = new GraphNode(x, y, row[y]);
        }
    }

    this.input = grid;
    this.nodes = nodes;
}

Graph.prototype.toString = function() {
    var graphString = "\n";
    var nodes = this.nodes;
    var rowDebug, row, y, l;
    for (var x = 0, len = nodes.length; x < len; x++) {
        rowDebug = "";
        row = nodes[x];
        for (y = 0, l = row.length; y < l; y++) {
            rowDebug += row[y].type + " ";
        }
        graphString = graphString + rowDebug + "\n";
    }
    return graphString;
};

function GraphNode(x,y,type) {
    this.data = { };
    this.x = x;
    this.y = y;
    this.pos = {
        x: x, 
        y: y
    };
    this.type = type;
}

GraphNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GraphNode.prototype.isWall = function() {
    return this.type == GraphNodeType.WALL;
};


function BinaryHeap(scoreFunction){
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
             this.content[0] = end;
             this.bubbleUp(0);
        }
        return result;
    },
    remove: function(node) {
        var i = this.content.indexOf(node);
    
        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;
            
            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            }
            else {
                this.bubbleUp(i);
            }
        }
    },
    size: function() {
        return this.content.length;
    },
    rescoreElement: function(node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function(n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1,
                parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            }

            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    },
    bubbleUp: function(n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = this.scoreFunction(element);
        
        while(true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1, child1N = child2N - 1;
            // This is used to store the new position of the element,
            // if any.
            var swap = null;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
            // Look it up and compute its score.
            var child1 = this.content[child1N],
                child1Score = this.scoreFunction(child1);

            // If the score is less than our element's, we need to swap.
            if (child1Score < elemScore)
                swap = child1N;
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }

            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
};

var astar = {
    init: function(grid) {
        for(var x = 0, xl = grid.length; x < xl; x++) {
            for(var y = 0, yl = grid[x].length; y < yl; y++) {
                var node = grid[x][y];
                node.f = 0;
                node.g = 0;
                node.h = 0;
                node.cost = node.type;
                node.visited = false;
                node.closed = false;
                node.parent = null;
            }
        }
    },
    heap: function() {
        return new BinaryHeap(function(node) { 
            return node.f; 
        });
    },
    search: function(grid, start, end, diagonal, heuristic) {
        astar.init(grid);
        heuristic = heuristic || astar.manhattan;
        diagonal = !!diagonal;

        var openHeap = astar.heap();

        openHeap.push(start);

        while(openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if(currentNode === end) {
                var curr = currentNode;
                var ret = [];
                while(curr.parent) {
                    ret.push(curr);
                    curr = curr.parent;
                }
                return ret.reverse();
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node. Optionally find diagonal neighbors as well (false by default).
            var neighbors = astar.neighbors(grid, currentNode, diagonal);

            for(var i=0, il = neighbors.length; i < il; i++) {
                var neighbor = neighbors[i];

                if(neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var gScore = currentNode.g + neighbor.cost;
                var beenVisited = neighbor.visited;

                if(!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || heuristic(neighbor.pos, end.pos);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g + neighbor.h;

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },
    manhattan: function(pos0, pos1) {
        // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html

        var d1 = Math.abs (pos1.x - pos0.x);
        var d2 = Math.abs (pos1.y - pos0.y);
        return d1 + d2;
    },
    neighbors: function(grid, node, diagonals) {
        var ret = [];
        var x = node.x;
        var y = node.y;

        // West
        if(grid[x-1] && grid[x-1][y]) {
            ret.push(grid[x-1][y]);
        }

        // East
        if(grid[x+1] && grid[x+1][y]) {
            ret.push(grid[x+1][y]);
        }

        // South
        if(grid[x] && grid[x][y-1]) {
            ret.push(grid[x][y-1]);
        }

        // North
        if(grid[x] && grid[x][y+1]) {
            ret.push(grid[x][y+1]);
        }

        if (diagonals) {

            // Southwest
            if(grid[x-1] && grid[x-1][y-1]) {
                ret.push(grid[x-1][y-1]);
            }

            // Southeast
            if(grid[x+1] && grid[x+1][y-1]) {
                ret.push(grid[x+1][y-1]);
            }

            // Northwest
            if(grid[x-1] && grid[x-1][y+1]) {
                ret.push(grid[x-1][y+1]);
            }

            // Northeast
            if(grid[x+1] && grid[x+1][y+1]) {
                ret.push(grid[x+1][y+1]);
            }

        }

        return ret;
    }
};
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END ASTAR PATHFINDING ALGORITHM


//BOX2D PHYSICS ENGINE
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------

/*
* Copyright (c) 2006-2009 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

var Box2D={};
(function(F,G){function K(){}if(!(Object.prototype.defineProperty instanceof Function)&&Object.prototype.__defineGetter__ instanceof Function&&Object.prototype.__defineSetter__ instanceof Function)Object.defineProperty=function(y,w,A){A.get instanceof Function&&y.__defineGetter__(w,A.get);A.set instanceof Function&&y.__defineSetter__(w,A.set)};F.inherit=function(y,w){K.prototype=w.prototype;y.prototype=new K;y.prototype.constructor=y};F.generateCallback=function(y,w){return function(){w.apply(y,arguments)}};
F.NVector=function(y){if(y===G)y=0;for(var w=Array(y||0),A=0;A<y;++A)w[A]=0;return w};F.is=function(y,w){if(y===null)return false;if(w instanceof Function&&y instanceof w)return true;if(y.constructor.__implements!=G&&y.constructor.__implements[w])return true;return false};F.parseUInt=function(y){return Math.abs(parseInt(y))}})(Box2D);var Vector=Array,Vector_a2j_Number=Box2D.NVector;if(typeof Box2D==="undefined")Box2D={};if(typeof Box2D.Collision==="undefined")Box2D.Collision={};
if(typeof Box2D.Collision.Shapes==="undefined")Box2D.Collision.Shapes={};if(typeof Box2D.Common==="undefined")Box2D.Common={};if(typeof Box2D.Common.Math==="undefined")Box2D.Common.Math={};if(typeof Box2D.Dynamics==="undefined")Box2D.Dynamics={};if(typeof Box2D.Dynamics.Contacts==="undefined")Box2D.Dynamics.Contacts={};if(typeof Box2D.Dynamics.Controllers==="undefined")Box2D.Dynamics.Controllers={};if(typeof Box2D.Dynamics.Joints==="undefined")Box2D.Dynamics.Joints={};
(function(){function F(){F.b2AABB.apply(this,arguments)}function G(){G.b2Bound.apply(this,arguments)}function K(){K.b2BoundValues.apply(this,arguments);this.constructor===K&&this.b2BoundValues.apply(this,arguments)}function y(){y.b2Collision.apply(this,arguments)}function w(){w.b2ContactID.apply(this,arguments);this.constructor===w&&this.b2ContactID.apply(this,arguments)}function A(){A.b2ContactPoint.apply(this,arguments)}function U(){U.b2Distance.apply(this,arguments)}function p(){p.b2DistanceInput.apply(this,
arguments)}function B(){B.b2DistanceOutput.apply(this,arguments)}function Q(){Q.b2DistanceProxy.apply(this,arguments)}function V(){V.b2DynamicTree.apply(this,arguments);this.constructor===V&&this.b2DynamicTree.apply(this,arguments)}function M(){M.b2DynamicTreeBroadPhase.apply(this,arguments)}function L(){L.b2DynamicTreeNode.apply(this,arguments)}function I(){I.b2DynamicTreePair.apply(this,arguments)}function W(){W.b2Manifold.apply(this,arguments);this.constructor===W&&this.b2Manifold.apply(this,arguments)}
function Y(){Y.b2ManifoldPoint.apply(this,arguments);this.constructor===Y&&this.b2ManifoldPoint.apply(this,arguments)}function k(){k.b2Point.apply(this,arguments)}function z(){z.b2RayCastInput.apply(this,arguments);this.constructor===z&&this.b2RayCastInput.apply(this,arguments)}function u(){u.b2RayCastOutput.apply(this,arguments)}function D(){D.b2Segment.apply(this,arguments)}function H(){H.b2SeparationFunction.apply(this,arguments)}function O(){O.b2Simplex.apply(this,arguments);this.constructor===
O&&this.b2Simplex.apply(this,arguments)}function E(){E.b2SimplexCache.apply(this,arguments)}function R(){R.b2SimplexVertex.apply(this,arguments)}function N(){N.b2TimeOfImpact.apply(this,arguments)}function S(){S.b2TOIInput.apply(this,arguments)}function aa(){aa.b2WorldManifold.apply(this,arguments);this.constructor===aa&&this.b2WorldManifold.apply(this,arguments)}function Z(){Z.ClipVertex.apply(this,arguments)}function d(){d.Features.apply(this,arguments)}function h(){h.b2CircleShape.apply(this,arguments);
this.constructor===h&&this.b2CircleShape.apply(this,arguments)}function l(){l.b2EdgeChainDef.apply(this,arguments);this.constructor===l&&this.b2EdgeChainDef.apply(this,arguments)}function j(){j.b2EdgeShape.apply(this,arguments);this.constructor===j&&this.b2EdgeShape.apply(this,arguments)}function o(){o.b2MassData.apply(this,arguments)}function q(){q.b2PolygonShape.apply(this,arguments);this.constructor===q&&this.b2PolygonShape.apply(this,arguments)}function n(){n.b2Shape.apply(this,arguments);this.constructor===
n&&this.b2Shape.apply(this,arguments)}function a(){a.b2Color.apply(this,arguments);this.constructor===a&&this.b2Color.apply(this,arguments)}function c(){c.b2Settings.apply(this,arguments)}function g(){g.b2Mat22.apply(this,arguments);this.constructor===g&&this.b2Mat22.apply(this,arguments)}function b(){b.b2Mat33.apply(this,arguments);this.constructor===b&&this.b2Mat33.apply(this,arguments)}function e(){e.b2Math.apply(this,arguments)}function f(){f.b2Sweep.apply(this,arguments)}function m(){m.b2Transform.apply(this,
arguments);this.constructor===m&&this.b2Transform.apply(this,arguments)}function r(){r.b2Vec2.apply(this,arguments);this.constructor===r&&this.b2Vec2.apply(this,arguments)}function s(){s.b2Vec3.apply(this,arguments);this.constructor===s&&this.b2Vec3.apply(this,arguments)}function v(){v.b2Body.apply(this,arguments);this.constructor===v&&this.b2Body.apply(this,arguments)}function t(){t.b2BodyDef.apply(this,arguments);this.constructor===t&&this.b2BodyDef.apply(this,arguments)}function x(){x.b2ContactFilter.apply(this,
arguments)}function C(){C.b2ContactImpulse.apply(this,arguments)}function J(){J.b2ContactListener.apply(this,arguments)}function T(){T.b2ContactManager.apply(this,arguments);this.constructor===T&&this.b2ContactManager.apply(this,arguments)}function P(){P.b2DebugDraw.apply(this,arguments);this.constructor===P&&this.b2DebugDraw.apply(this,arguments)}function X(){X.b2DestructionListener.apply(this,arguments)}function $(){$.b2FilterData.apply(this,arguments)}function ba(){ba.b2Fixture.apply(this,arguments);
this.constructor===ba&&this.b2Fixture.apply(this,arguments)}function ca(){ca.b2FixtureDef.apply(this,arguments);this.constructor===ca&&this.b2FixtureDef.apply(this,arguments)}function da(){da.b2Island.apply(this,arguments);this.constructor===da&&this.b2Island.apply(this,arguments)}function Fa(){Fa.b2TimeStep.apply(this,arguments)}function ea(){ea.b2World.apply(this,arguments);this.constructor===ea&&this.b2World.apply(this,arguments)}function Ga(){Ga.b2CircleContact.apply(this,arguments)}function fa(){fa.b2Contact.apply(this,
arguments);this.constructor===fa&&this.b2Contact.apply(this,arguments)}function ga(){ga.b2ContactConstraint.apply(this,arguments);this.constructor===ga&&this.b2ContactConstraint.apply(this,arguments)}function Ha(){Ha.b2ContactConstraintPoint.apply(this,arguments)}function Ia(){Ia.b2ContactEdge.apply(this,arguments)}function ha(){ha.b2ContactFactory.apply(this,arguments);this.constructor===ha&&this.b2ContactFactory.apply(this,arguments)}function Ja(){Ja.b2ContactRegister.apply(this,arguments)}function Ka(){Ka.b2ContactResult.apply(this,
arguments)}function ia(){ia.b2ContactSolver.apply(this,arguments);this.constructor===ia&&this.b2ContactSolver.apply(this,arguments)}function La(){La.b2EdgeAndCircleContact.apply(this,arguments)}function ja(){ja.b2NullContact.apply(this,arguments);this.constructor===ja&&this.b2NullContact.apply(this,arguments)}function Ma(){Ma.b2PolyAndCircleContact.apply(this,arguments)}function Na(){Na.b2PolyAndEdgeContact.apply(this,arguments)}function Oa(){Oa.b2PolygonContact.apply(this,arguments)}function ka(){ka.b2PositionSolverManifold.apply(this,
arguments);this.constructor===ka&&this.b2PositionSolverManifold.apply(this,arguments)}function Pa(){Pa.b2BuoyancyController.apply(this,arguments)}function Qa(){Qa.b2ConstantAccelController.apply(this,arguments)}function Ra(){Ra.b2ConstantForceController.apply(this,arguments)}function Sa(){Sa.b2Controller.apply(this,arguments)}function Ta(){Ta.b2ControllerEdge.apply(this,arguments)}function Ua(){Ua.b2GravityController.apply(this,arguments)}function Va(){Va.b2TensorDampingController.apply(this,arguments)}
function la(){la.b2DistanceJoint.apply(this,arguments);this.constructor===la&&this.b2DistanceJoint.apply(this,arguments)}function ma(){ma.b2DistanceJointDef.apply(this,arguments);this.constructor===ma&&this.b2DistanceJointDef.apply(this,arguments)}function na(){na.b2FrictionJoint.apply(this,arguments);this.constructor===na&&this.b2FrictionJoint.apply(this,arguments)}function oa(){oa.b2FrictionJointDef.apply(this,arguments);this.constructor===oa&&this.b2FrictionJointDef.apply(this,arguments)}function pa(){pa.b2GearJoint.apply(this,
arguments);this.constructor===pa&&this.b2GearJoint.apply(this,arguments)}function qa(){qa.b2GearJointDef.apply(this,arguments);this.constructor===qa&&this.b2GearJointDef.apply(this,arguments)}function Wa(){Wa.b2Jacobian.apply(this,arguments)}function ra(){ra.b2Joint.apply(this,arguments);this.constructor===ra&&this.b2Joint.apply(this,arguments)}function sa(){sa.b2JointDef.apply(this,arguments);this.constructor===sa&&this.b2JointDef.apply(this,arguments)}function Xa(){Xa.b2JointEdge.apply(this,arguments)}
function ta(){ta.b2LineJoint.apply(this,arguments);this.constructor===ta&&this.b2LineJoint.apply(this,arguments)}function ua(){ua.b2LineJointDef.apply(this,arguments);this.constructor===ua&&this.b2LineJointDef.apply(this,arguments)}function va(){va.b2MouseJoint.apply(this,arguments);this.constructor===va&&this.b2MouseJoint.apply(this,arguments)}function wa(){wa.b2MouseJointDef.apply(this,arguments);this.constructor===wa&&this.b2MouseJointDef.apply(this,arguments)}function xa(){xa.b2PrismaticJoint.apply(this,
arguments);this.constructor===xa&&this.b2PrismaticJoint.apply(this,arguments)}function ya(){ya.b2PrismaticJointDef.apply(this,arguments);this.constructor===ya&&this.b2PrismaticJointDef.apply(this,arguments)}function za(){za.b2PulleyJoint.apply(this,arguments);this.constructor===za&&this.b2PulleyJoint.apply(this,arguments)}function Aa(){Aa.b2PulleyJointDef.apply(this,arguments);this.constructor===Aa&&this.b2PulleyJointDef.apply(this,arguments)}function Ba(){Ba.b2RevoluteJoint.apply(this,arguments);
this.constructor===Ba&&this.b2RevoluteJoint.apply(this,arguments)}function Ca(){Ca.b2RevoluteJointDef.apply(this,arguments);this.constructor===Ca&&this.b2RevoluteJointDef.apply(this,arguments)}function Da(){Da.b2WeldJoint.apply(this,arguments);this.constructor===Da&&this.b2WeldJoint.apply(this,arguments)}function Ea(){Ea.b2WeldJointDef.apply(this,arguments);this.constructor===Ea&&this.b2WeldJointDef.apply(this,arguments)}Box2D.Collision.IBroadPhase="Box2D.Collision.IBroadPhase";Box2D.Collision.b2AABB=
F;Box2D.Collision.b2Bound=G;Box2D.Collision.b2BoundValues=K;Box2D.Collision.b2Collision=y;Box2D.Collision.b2ContactID=w;Box2D.Collision.b2ContactPoint=A;Box2D.Collision.b2Distance=U;Box2D.Collision.b2DistanceInput=p;Box2D.Collision.b2DistanceOutput=B;Box2D.Collision.b2DistanceProxy=Q;Box2D.Collision.b2DynamicTree=V;Box2D.Collision.b2DynamicTreeBroadPhase=M;Box2D.Collision.b2DynamicTreeNode=L;Box2D.Collision.b2DynamicTreePair=I;Box2D.Collision.b2Manifold=W;Box2D.Collision.b2ManifoldPoint=Y;Box2D.Collision.b2Point=
k;Box2D.Collision.b2RayCastInput=z;Box2D.Collision.b2RayCastOutput=u;Box2D.Collision.b2Segment=D;Box2D.Collision.b2SeparationFunction=H;Box2D.Collision.b2Simplex=O;Box2D.Collision.b2SimplexCache=E;Box2D.Collision.b2SimplexVertex=R;Box2D.Collision.b2TimeOfImpact=N;Box2D.Collision.b2TOIInput=S;Box2D.Collision.b2WorldManifold=aa;Box2D.Collision.ClipVertex=Z;Box2D.Collision.Features=d;Box2D.Collision.Shapes.b2CircleShape=h;Box2D.Collision.Shapes.b2EdgeChainDef=l;Box2D.Collision.Shapes.b2EdgeShape=j;Box2D.Collision.Shapes.b2MassData=
o;Box2D.Collision.Shapes.b2PolygonShape=q;Box2D.Collision.Shapes.b2Shape=n;Box2D.Common.b2internal="Box2D.Common.b2internal";Box2D.Common.b2Color=a;Box2D.Common.b2Settings=c;Box2D.Common.Math.b2Mat22=g;Box2D.Common.Math.b2Mat33=b;Box2D.Common.Math.b2Math=e;Box2D.Common.Math.b2Sweep=f;Box2D.Common.Math.b2Transform=m;Box2D.Common.Math.b2Vec2=r;Box2D.Common.Math.b2Vec3=s;Box2D.Dynamics.b2Body=v;Box2D.Dynamics.b2BodyDef=t;Box2D.Dynamics.b2ContactFilter=x;Box2D.Dynamics.b2ContactImpulse=C;Box2D.Dynamics.b2ContactListener=
J;Box2D.Dynamics.b2ContactManager=T;Box2D.Dynamics.b2DebugDraw=P;Box2D.Dynamics.b2DestructionListener=X;Box2D.Dynamics.b2FilterData=$;Box2D.Dynamics.b2Fixture=ba;Box2D.Dynamics.b2FixtureDef=ca;Box2D.Dynamics.b2Island=da;Box2D.Dynamics.b2TimeStep=Fa;Box2D.Dynamics.b2World=ea;Box2D.Dynamics.Contacts.b2CircleContact=Ga;Box2D.Dynamics.Contacts.b2Contact=fa;Box2D.Dynamics.Contacts.b2ContactConstraint=ga;Box2D.Dynamics.Contacts.b2ContactConstraintPoint=Ha;Box2D.Dynamics.Contacts.b2ContactEdge=Ia;Box2D.Dynamics.Contacts.b2ContactFactory=
ha;Box2D.Dynamics.Contacts.b2ContactRegister=Ja;Box2D.Dynamics.Contacts.b2ContactResult=Ka;Box2D.Dynamics.Contacts.b2ContactSolver=ia;Box2D.Dynamics.Contacts.b2EdgeAndCircleContact=La;Box2D.Dynamics.Contacts.b2NullContact=ja;Box2D.Dynamics.Contacts.b2PolyAndCircleContact=Ma;Box2D.Dynamics.Contacts.b2PolyAndEdgeContact=Na;Box2D.Dynamics.Contacts.b2PolygonContact=Oa;Box2D.Dynamics.Contacts.b2PositionSolverManifold=ka;Box2D.Dynamics.Controllers.b2BuoyancyController=Pa;Box2D.Dynamics.Controllers.b2ConstantAccelController=
Qa;Box2D.Dynamics.Controllers.b2ConstantForceController=Ra;Box2D.Dynamics.Controllers.b2Controller=Sa;Box2D.Dynamics.Controllers.b2ControllerEdge=Ta;Box2D.Dynamics.Controllers.b2GravityController=Ua;Box2D.Dynamics.Controllers.b2TensorDampingController=Va;Box2D.Dynamics.Joints.b2DistanceJoint=la;Box2D.Dynamics.Joints.b2DistanceJointDef=ma;Box2D.Dynamics.Joints.b2FrictionJoint=na;Box2D.Dynamics.Joints.b2FrictionJointDef=oa;Box2D.Dynamics.Joints.b2GearJoint=pa;Box2D.Dynamics.Joints.b2GearJointDef=qa;
Box2D.Dynamics.Joints.b2Jacobian=Wa;Box2D.Dynamics.Joints.b2Joint=ra;Box2D.Dynamics.Joints.b2JointDef=sa;Box2D.Dynamics.Joints.b2JointEdge=Xa;Box2D.Dynamics.Joints.b2LineJoint=ta;Box2D.Dynamics.Joints.b2LineJointDef=ua;Box2D.Dynamics.Joints.b2MouseJoint=va;Box2D.Dynamics.Joints.b2MouseJointDef=wa;Box2D.Dynamics.Joints.b2PrismaticJoint=xa;Box2D.Dynamics.Joints.b2PrismaticJointDef=ya;Box2D.Dynamics.Joints.b2PulleyJoint=za;Box2D.Dynamics.Joints.b2PulleyJointDef=Aa;Box2D.Dynamics.Joints.b2RevoluteJoint=
Ba;Box2D.Dynamics.Joints.b2RevoluteJointDef=Ca;Box2D.Dynamics.Joints.b2WeldJoint=Da;Box2D.Dynamics.Joints.b2WeldJointDef=Ea})();Box2D.postDefs=[];
(function(){var F=Box2D.Collision.Shapes.b2CircleShape,G=Box2D.Collision.Shapes.b2PolygonShape,K=Box2D.Collision.Shapes.b2Shape,y=Box2D.Common.b2Settings,w=Box2D.Common.Math.b2Math,A=Box2D.Common.Math.b2Sweep,U=Box2D.Common.Math.b2Transform,p=Box2D.Common.Math.b2Vec2,B=Box2D.Collision.b2AABB,Q=Box2D.Collision.b2Bound,V=Box2D.Collision.b2BoundValues,M=Box2D.Collision.b2Collision,L=Box2D.Collision.b2ContactID,I=Box2D.Collision.b2ContactPoint,W=Box2D.Collision.b2Distance,Y=Box2D.Collision.b2DistanceInput,
k=Box2D.Collision.b2DistanceOutput,z=Box2D.Collision.b2DistanceProxy,u=Box2D.Collision.b2DynamicTree,D=Box2D.Collision.b2DynamicTreeBroadPhase,H=Box2D.Collision.b2DynamicTreeNode,O=Box2D.Collision.b2DynamicTreePair,E=Box2D.Collision.b2Manifold,R=Box2D.Collision.b2ManifoldPoint,N=Box2D.Collision.b2Point,S=Box2D.Collision.b2RayCastInput,aa=Box2D.Collision.b2RayCastOutput,Z=Box2D.Collision.b2Segment,d=Box2D.Collision.b2SeparationFunction,h=Box2D.Collision.b2Simplex,l=Box2D.Collision.b2SimplexCache,j=
Box2D.Collision.b2SimplexVertex,o=Box2D.Collision.b2TimeOfImpact,q=Box2D.Collision.b2TOIInput,n=Box2D.Collision.b2WorldManifold,a=Box2D.Collision.ClipVertex,c=Box2D.Collision.Features,g=Box2D.Collision.IBroadPhase;B.b2AABB=function(){this.lowerBound=new p;this.upperBound=new p};B.prototype.IsValid=function(){var b=this.upperBound.y-this.lowerBound.y;return b=(b=this.upperBound.x-this.lowerBound.x>=0&&b>=0)&&this.lowerBound.IsValid()&&this.upperBound.IsValid()};B.prototype.GetCenter=function(){return new p((this.lowerBound.x+
this.upperBound.x)/2,(this.lowerBound.y+this.upperBound.y)/2)};B.prototype.GetExtents=function(){return new p((this.upperBound.x-this.lowerBound.x)/2,(this.upperBound.y-this.lowerBound.y)/2)};B.prototype.Contains=function(b){var e=true;return e=(e=(e=(e=e&&this.lowerBound.x<=b.lowerBound.x)&&this.lowerBound.y<=b.lowerBound.y)&&b.upperBound.x<=this.upperBound.x)&&b.upperBound.y<=this.upperBound.y};B.prototype.RayCast=function(b,e){var f=-Number.MAX_VALUE,m=Number.MAX_VALUE,r=e.p1.x,s=e.p1.y,v=e.p2.x-
e.p1.x,t=e.p2.y-e.p1.y,x=Math.abs(t),C=b.normal,J=0,T=0,P=J=0;P=0;if(Math.abs(v)<Number.MIN_VALUE){if(r<this.lowerBound.x||this.upperBound.x<r)return false}else{J=1/v;T=(this.lowerBound.x-r)*J;J=(this.upperBound.x-r)*J;P=-1;if(T>J){P=T;T=J;J=P;P=1}if(T>f){C.x=P;C.y=0;f=T}m=Math.min(m,J);if(f>m)return false}if(x<Number.MIN_VALUE){if(s<this.lowerBound.y||this.upperBound.y<s)return false}else{J=1/t;T=(this.lowerBound.y-s)*J;J=(this.upperBound.y-s)*J;P=-1;if(T>J){P=T;T=J;J=P;P=1}if(T>f){C.y=P;C.x=0;f=
T}m=Math.min(m,J);if(f>m)return false}b.fraction=f;return true};B.prototype.TestOverlap=function(b){var e=b.lowerBound.y-this.upperBound.y,f=this.lowerBound.y-b.upperBound.y;if(b.lowerBound.x-this.upperBound.x>0||e>0)return false;if(this.lowerBound.x-b.upperBound.x>0||f>0)return false;return true};B.Combine=function(b,e){var f=new B;f.Combine(b,e);return f};B.prototype.Combine=function(b,e){this.lowerBound.x=Math.min(b.lowerBound.x,e.lowerBound.x);this.lowerBound.y=Math.min(b.lowerBound.y,e.lowerBound.y);
this.upperBound.x=Math.max(b.upperBound.x,e.upperBound.x);this.upperBound.y=Math.max(b.upperBound.y,e.upperBound.y)};Q.b2Bound=function(){};Q.prototype.IsLower=function(){return(this.value&1)==0};Q.prototype.IsUpper=function(){return(this.value&1)==1};Q.prototype.Swap=function(b){var e=this.value,f=this.proxy,m=this.stabbingCount;this.value=b.value;this.proxy=b.proxy;this.stabbingCount=b.stabbingCount;b.value=e;b.proxy=f;b.stabbingCount=m};V.b2BoundValues=function(){};V.prototype.b2BoundValues=function(){this.lowerValues=
new Vector_a2j_Number;this.lowerValues[0]=0;this.lowerValues[1]=0;this.upperValues=new Vector_a2j_Number;this.upperValues[0]=0;this.upperValues[1]=0};M.b2Collision=function(){};M.ClipSegmentToLine=function(b,e,f,m){if(m===undefined)m=0;var r,s=0;r=e[0];var v=r.v;r=e[1];var t=r.v,x=f.x*v.x+f.y*v.y-m;r=f.x*t.x+f.y*t.y-m;x<=0&&b[s++].Set(e[0]);r<=0&&b[s++].Set(e[1]);if(x*r<0){f=x/(x-r);r=b[s];r=r.v;r.x=v.x+f*(t.x-v.x);r.y=v.y+f*(t.y-v.y);r=b[s];r.id=(x>0?e[0]:e[1]).id;++s}return s};M.EdgeSeparation=
function(b,e,f,m,r){if(f===undefined)f=0;parseInt(b.m_vertexCount);var s=b.m_vertices;b=b.m_normals;var v=parseInt(m.m_vertexCount),t=m.m_vertices,x,C;x=e.R;C=b[f];b=x.col1.x*C.x+x.col2.x*C.y;m=x.col1.y*C.x+x.col2.y*C.y;x=r.R;var J=x.col1.x*b+x.col1.y*m;x=x.col2.x*b+x.col2.y*m;for(var T=0,P=Number.MAX_VALUE,X=0;X<v;++X){C=t[X];C=C.x*J+C.y*x;if(C<P){P=C;T=X}}C=s[f];x=e.R;f=e.position.x+(x.col1.x*C.x+x.col2.x*C.y);e=e.position.y+(x.col1.y*C.x+x.col2.y*C.y);C=t[T];x=r.R;s=r.position.x+(x.col1.x*C.x+
x.col2.x*C.y);r=r.position.y+(x.col1.y*C.x+x.col2.y*C.y);s-=f;r-=e;return s*b+r*m};M.FindMaxSeparation=function(b,e,f,m,r){var s=parseInt(e.m_vertexCount),v=e.m_normals,t,x;x=r.R;t=m.m_centroid;var C=r.position.x+(x.col1.x*t.x+x.col2.x*t.y),J=r.position.y+(x.col1.y*t.x+x.col2.y*t.y);x=f.R;t=e.m_centroid;C-=f.position.x+(x.col1.x*t.x+x.col2.x*t.y);J-=f.position.y+(x.col1.y*t.x+x.col2.y*t.y);x=C*f.R.col1.x+J*f.R.col1.y;J=C*f.R.col2.x+J*f.R.col2.y;C=0;for(var T=-Number.MAX_VALUE,P=0;P<s;++P){t=v[P];
t=t.x*x+t.y*J;if(t>T){T=t;C=P}}v=M.EdgeSeparation(e,f,C,m,r);t=parseInt(C-1>=0?C-1:s-1);x=M.EdgeSeparation(e,f,t,m,r);J=parseInt(C+1<s?C+1:0);T=M.EdgeSeparation(e,f,J,m,r);var X=P=0,$=0;if(x>v&&x>T){$=-1;P=t;X=x}else if(T>v){$=1;P=J;X=T}else{b[0]=C;return v}for(;;){C=$==-1?P-1>=0?P-1:s-1:P+1<s?P+1:0;v=M.EdgeSeparation(e,f,C,m,r);if(v>X){P=C;X=v}else break}b[0]=P;return X};M.FindIncidentEdge=function(b,e,f,m,r,s){if(m===undefined)m=0;parseInt(e.m_vertexCount);var v=e.m_normals,t=parseInt(r.m_vertexCount);
e=r.m_vertices;r=r.m_normals;var x;x=f.R;f=v[m];v=x.col1.x*f.x+x.col2.x*f.y;var C=x.col1.y*f.x+x.col2.y*f.y;x=s.R;f=x.col1.x*v+x.col1.y*C;C=x.col2.x*v+x.col2.y*C;v=f;x=0;for(var J=Number.MAX_VALUE,T=0;T<t;++T){f=r[T];f=v*f.x+C*f.y;if(f<J){J=f;x=T}}r=parseInt(x);v=parseInt(r+1<t?r+1:0);t=b[0];f=e[r];x=s.R;t.v.x=s.position.x+(x.col1.x*f.x+x.col2.x*f.y);t.v.y=s.position.y+(x.col1.y*f.x+x.col2.y*f.y);t.id.features.referenceEdge=m;t.id.features.incidentEdge=r;t.id.features.incidentVertex=0;t=b[1];f=e[v];
x=s.R;t.v.x=s.position.x+(x.col1.x*f.x+x.col2.x*f.y);t.v.y=s.position.y+(x.col1.y*f.x+x.col2.y*f.y);t.id.features.referenceEdge=m;t.id.features.incidentEdge=v;t.id.features.incidentVertex=1};M.MakeClipPointVector=function(){var b=new Vector(2);b[0]=new a;b[1]=new a;return b};M.CollidePolygons=function(b,e,f,m,r){var s;b.m_pointCount=0;var v=e.m_radius+m.m_radius;s=0;M.s_edgeAO[0]=s;var t=M.FindMaxSeparation(M.s_edgeAO,e,f,m,r);s=M.s_edgeAO[0];if(!(t>v)){var x=0;M.s_edgeBO[0]=x;var C=M.FindMaxSeparation(M.s_edgeBO,
m,r,e,f);x=M.s_edgeBO[0];if(!(C>v)){var J=0,T=0;if(C>0.98*t+0.0010){t=m;m=e;e=r;f=f;J=x;b.m_type=E.e_faceB;T=1}else{t=e;m=m;e=f;f=r;J=s;b.m_type=E.e_faceA;T=0}s=M.s_incidentEdge;M.FindIncidentEdge(s,t,e,J,m,f);x=parseInt(t.m_vertexCount);r=t.m_vertices;t=r[J];var P;P=J+1<x?r[parseInt(J+1)]:r[0];J=M.s_localTangent;J.Set(P.x-t.x,P.y-t.y);J.Normalize();r=M.s_localNormal;r.x=J.y;r.y=-J.x;m=M.s_planePoint;m.Set(0.5*(t.x+P.x),0.5*(t.y+P.y));C=M.s_tangent;x=e.R;C.x=x.col1.x*J.x+x.col2.x*J.y;C.y=x.col1.y*
J.x+x.col2.y*J.y;var X=M.s_tangent2;X.x=-C.x;X.y=-C.y;J=M.s_normal;J.x=C.y;J.y=-C.x;var $=M.s_v11,ba=M.s_v12;$.x=e.position.x+(x.col1.x*t.x+x.col2.x*t.y);$.y=e.position.y+(x.col1.y*t.x+x.col2.y*t.y);ba.x=e.position.x+(x.col1.x*P.x+x.col2.x*P.y);ba.y=e.position.y+(x.col1.y*P.x+x.col2.y*P.y);e=J.x*$.x+J.y*$.y;x=C.x*ba.x+C.y*ba.y+v;P=M.s_clipPoints1;t=M.s_clipPoints2;ba=0;ba=M.ClipSegmentToLine(P,s,X,-C.x*$.x-C.y*$.y+v);if(!(ba<2)){ba=M.ClipSegmentToLine(t,P,C,x);if(!(ba<2)){b.m_localPlaneNormal.SetV(r);
b.m_localPoint.SetV(m);for(m=r=0;m<y.b2_maxManifoldPoints;++m){s=t[m];if(J.x*s.v.x+J.y*s.v.y-e<=v){C=b.m_points[r];x=f.R;X=s.v.x-f.position.x;$=s.v.y-f.position.y;C.m_localPoint.x=X*x.col1.x+$*x.col1.y;C.m_localPoint.y=X*x.col2.x+$*x.col2.y;C.m_id.Set(s.id);C.m_id.features.flip=T;++r}}b.m_pointCount=r}}}}};M.CollideCircles=function(b,e,f,m,r){b.m_pointCount=0;var s,v;s=f.R;v=e.m_p;var t=f.position.x+(s.col1.x*v.x+s.col2.x*v.y);f=f.position.y+(s.col1.y*v.x+s.col2.y*v.y);s=r.R;v=m.m_p;t=r.position.x+
(s.col1.x*v.x+s.col2.x*v.y)-t;r=r.position.y+(s.col1.y*v.x+s.col2.y*v.y)-f;s=e.m_radius+m.m_radius;if(!(t*t+r*r>s*s)){b.m_type=E.e_circles;b.m_localPoint.SetV(e.m_p);b.m_localPlaneNormal.SetZero();b.m_pointCount=1;b.m_points[0].m_localPoint.SetV(m.m_p);b.m_points[0].m_id.key=0}};M.CollidePolygonAndCircle=function(b,e,f,m,r){var s=b.m_pointCount=0,v=0,t,x;x=r.R;t=m.m_p;var C=r.position.y+(x.col1.y*t.x+x.col2.y*t.y);s=r.position.x+(x.col1.x*t.x+x.col2.x*t.y)-f.position.x;v=C-f.position.y;x=f.R;f=s*
x.col1.x+v*x.col1.y;x=s*x.col2.x+v*x.col2.y;var J=0;C=-Number.MAX_VALUE;r=e.m_radius+m.m_radius;var T=parseInt(e.m_vertexCount),P=e.m_vertices;e=e.m_normals;for(var X=0;X<T;++X){t=P[X];s=f-t.x;v=x-t.y;t=e[X];s=t.x*s+t.y*v;if(s>r)return;if(s>C){C=s;J=X}}s=parseInt(J);v=parseInt(s+1<T?s+1:0);t=P[s];P=P[v];if(C<Number.MIN_VALUE){b.m_pointCount=1;b.m_type=E.e_faceA;b.m_localPlaneNormal.SetV(e[J]);b.m_localPoint.x=0.5*(t.x+P.x);b.m_localPoint.y=0.5*(t.y+P.y)}else{C=(f-P.x)*(t.x-P.x)+(x-P.y)*(t.y-P.y);
if((f-t.x)*(P.x-t.x)+(x-t.y)*(P.y-t.y)<=0){if((f-t.x)*(f-t.x)+(x-t.y)*(x-t.y)>r*r)return;b.m_pointCount=1;b.m_type=E.e_faceA;b.m_localPlaneNormal.x=f-t.x;b.m_localPlaneNormal.y=x-t.y;b.m_localPlaneNormal.Normalize();b.m_localPoint.SetV(t)}else if(C<=0){if((f-P.x)*(f-P.x)+(x-P.y)*(x-P.y)>r*r)return;b.m_pointCount=1;b.m_type=E.e_faceA;b.m_localPlaneNormal.x=f-P.x;b.m_localPlaneNormal.y=x-P.y;b.m_localPlaneNormal.Normalize();b.m_localPoint.SetV(P)}else{J=0.5*(t.x+P.x);t=0.5*(t.y+P.y);C=(f-J)*e[s].x+
(x-t)*e[s].y;if(C>r)return;b.m_pointCount=1;b.m_type=E.e_faceA;b.m_localPlaneNormal.x=e[s].x;b.m_localPlaneNormal.y=e[s].y;b.m_localPlaneNormal.Normalize();b.m_localPoint.Set(J,t)}}b.m_points[0].m_localPoint.SetV(m.m_p);b.m_points[0].m_id.key=0};M.TestOverlap=function(b,e){var f=e.lowerBound,m=b.upperBound,r=f.x-m.x,s=f.y-m.y;f=b.lowerBound;m=e.upperBound;var v=f.y-m.y;if(r>0||s>0)return false;if(f.x-m.x>0||v>0)return false;return true};Box2D.postDefs.push(function(){Box2D.Collision.b2Collision.s_incidentEdge=
M.MakeClipPointVector();Box2D.Collision.b2Collision.s_clipPoints1=M.MakeClipPointVector();Box2D.Collision.b2Collision.s_clipPoints2=M.MakeClipPointVector();Box2D.Collision.b2Collision.s_edgeAO=new Vector_a2j_Number(1);Box2D.Collision.b2Collision.s_edgeBO=new Vector_a2j_Number(1);Box2D.Collision.b2Collision.s_localTangent=new p;Box2D.Collision.b2Collision.s_localNormal=new p;Box2D.Collision.b2Collision.s_planePoint=new p;Box2D.Collision.b2Collision.s_normal=new p;Box2D.Collision.b2Collision.s_tangent=
new p;Box2D.Collision.b2Collision.s_tangent2=new p;Box2D.Collision.b2Collision.s_v11=new p;Box2D.Collision.b2Collision.s_v12=new p;Box2D.Collision.b2Collision.b2CollidePolyTempVec=new p;Box2D.Collision.b2Collision.b2_nullFeature=255});L.b2ContactID=function(){this.features=new c};L.prototype.b2ContactID=function(){this.features._m_id=this};L.prototype.Set=function(b){this.key=b._key};L.prototype.Copy=function(){var b=new L;b.key=this.key;return b};Object.defineProperty(L.prototype,"key",{enumerable:false,
configurable:true,get:function(){return this._key}});Object.defineProperty(L.prototype,"key",{enumerable:false,configurable:true,set:function(b){if(b===undefined)b=0;this._key=b;this.features._referenceEdge=this._key&255;this.features._incidentEdge=(this._key&65280)>>8&255;this.features._incidentVertex=(this._key&16711680)>>16&255;this.features._flip=(this._key&4278190080)>>24&255}});I.b2ContactPoint=function(){this.position=new p;this.velocity=new p;this.normal=new p;this.id=new L};W.b2Distance=
function(){};W.Distance=function(b,e,f){++W.b2_gjkCalls;var m=f.proxyA,r=f.proxyB,s=f.transformA,v=f.transformB,t=W.s_simplex;t.ReadCache(e,m,s,r,v);var x=t.m_vertices,C=W.s_saveA,J=W.s_saveB,T=0;t.GetClosestPoint().LengthSquared();for(var P=0,X,$=0;$<20;){T=t.m_count;for(P=0;P<T;P++){C[P]=x[P].indexA;J[P]=x[P].indexB}switch(t.m_count){case 1:break;case 2:t.Solve2();break;case 3:t.Solve3();break;default:y.b2Assert(false)}if(t.m_count==3)break;X=t.GetClosestPoint();X.LengthSquared();P=t.GetSearchDirection();
if(P.LengthSquared()<Number.MIN_VALUE*Number.MIN_VALUE)break;X=x[t.m_count];X.indexA=m.GetSupport(w.MulTMV(s.R,P.GetNegative()));X.wA=w.MulX(s,m.GetVertex(X.indexA));X.indexB=r.GetSupport(w.MulTMV(v.R,P));X.wB=w.MulX(v,r.GetVertex(X.indexB));X.w=w.SubtractVV(X.wB,X.wA);++$;++W.b2_gjkIters;var ba=false;for(P=0;P<T;P++)if(X.indexA==C[P]&&X.indexB==J[P]){ba=true;break}if(ba)break;++t.m_count}W.b2_gjkMaxIters=w.Max(W.b2_gjkMaxIters,$);t.GetWitnessPoints(b.pointA,b.pointB);b.distance=w.SubtractVV(b.pointA,
b.pointB).Length();b.iterations=$;t.WriteCache(e);if(f.useRadii){e=m.m_radius;r=r.m_radius;if(b.distance>e+r&&b.distance>Number.MIN_VALUE){b.distance-=e+r;f=w.SubtractVV(b.pointB,b.pointA);f.Normalize();b.pointA.x+=e*f.x;b.pointA.y+=e*f.y;b.pointB.x-=r*f.x;b.pointB.y-=r*f.y}else{X=new p;X.x=0.5*(b.pointA.x+b.pointB.x);X.y=0.5*(b.pointA.y+b.pointB.y);b.pointA.x=b.pointB.x=X.x;b.pointA.y=b.pointB.y=X.y;b.distance=0}}};Box2D.postDefs.push(function(){Box2D.Collision.b2Distance.s_simplex=new h;Box2D.Collision.b2Distance.s_saveA=
new Vector_a2j_Number(3);Box2D.Collision.b2Distance.s_saveB=new Vector_a2j_Number(3)});Y.b2DistanceInput=function(){};k.b2DistanceOutput=function(){this.pointA=new p;this.pointB=new p};z.b2DistanceProxy=function(){};z.prototype.Set=function(b){switch(b.GetType()){case K.e_circleShape:b=b instanceof F?b:null;this.m_vertices=new Vector(1,true);this.m_vertices[0]=b.m_p;this.m_count=1;this.m_radius=b.m_radius;break;case K.e_polygonShape:b=b instanceof G?b:null;this.m_vertices=b.m_vertices;this.m_count=
b.m_vertexCount;this.m_radius=b.m_radius;break;default:y.b2Assert(false)}};z.prototype.GetSupport=function(b){for(var e=0,f=this.m_vertices[0].x*b.x+this.m_vertices[0].y*b.y,m=1;m<this.m_count;++m){var r=this.m_vertices[m].x*b.x+this.m_vertices[m].y*b.y;if(r>f){e=m;f=r}}return e};z.prototype.GetSupportVertex=function(b){for(var e=0,f=this.m_vertices[0].x*b.x+this.m_vertices[0].y*b.y,m=1;m<this.m_count;++m){var r=this.m_vertices[m].x*b.x+this.m_vertices[m].y*b.y;if(r>f){e=m;f=r}}return this.m_vertices[e]};
z.prototype.GetVertexCount=function(){return this.m_count};z.prototype.GetVertex=function(b){if(b===undefined)b=0;y.b2Assert(0<=b&&b<this.m_count);return this.m_vertices[b]};u.b2DynamicTree=function(){};u.prototype.b2DynamicTree=function(){this.m_freeList=this.m_root=null;this.m_insertionCount=this.m_path=0};u.prototype.CreateProxy=function(b,e){var f=this.AllocateNode(),m=y.b2_aabbExtension,r=y.b2_aabbExtension;f.aabb.lowerBound.x=b.lowerBound.x-m;f.aabb.lowerBound.y=b.lowerBound.y-r;f.aabb.upperBound.x=
b.upperBound.x+m;f.aabb.upperBound.y=b.upperBound.y+r;f.userData=e;this.InsertLeaf(f);return f};u.prototype.DestroyProxy=function(b){this.RemoveLeaf(b);this.FreeNode(b)};u.prototype.MoveProxy=function(b,e,f){y.b2Assert(b.IsLeaf());if(b.aabb.Contains(e))return false;this.RemoveLeaf(b);var m=y.b2_aabbExtension+y.b2_aabbMultiplier*(f.x>0?f.x:-f.x);f=y.b2_aabbExtension+y.b2_aabbMultiplier*(f.y>0?f.y:-f.y);b.aabb.lowerBound.x=e.lowerBound.x-m;b.aabb.lowerBound.y=e.lowerBound.y-f;b.aabb.upperBound.x=e.upperBound.x+
m;b.aabb.upperBound.y=e.upperBound.y+f;this.InsertLeaf(b);return true};u.prototype.Rebalance=function(b){if(b===undefined)b=0;if(this.m_root!=null)for(var e=0;e<b;e++){for(var f=this.m_root,m=0;f.IsLeaf()==false;){f=this.m_path>>m&1?f.child2:f.child1;m=m+1&31}++this.m_path;this.RemoveLeaf(f);this.InsertLeaf(f)}};u.prototype.GetFatAABB=function(b){return b.aabb};u.prototype.GetUserData=function(b){return b.userData};u.prototype.Query=function(b,e){if(this.m_root!=null){var f=new Vector,m=0;for(f[m++]=
this.m_root;m>0;){var r=f[--m];if(r.aabb.TestOverlap(e))if(r.IsLeaf()){if(!b(r))break}else{f[m++]=r.child1;f[m++]=r.child2}}}};u.prototype.RayCast=function(b,e){if(this.m_root!=null){var f=e.p1,m=e.p2,r=w.SubtractVV(f,m);r.Normalize();r=w.CrossFV(1,r);var s=w.AbsV(r),v=e.maxFraction,t=new B,x=0,C=0;x=f.x+v*(m.x-f.x);C=f.y+v*(m.y-f.y);t.lowerBound.x=Math.min(f.x,x);t.lowerBound.y=Math.min(f.y,C);t.upperBound.x=Math.max(f.x,x);t.upperBound.y=Math.max(f.y,C);var J=new Vector,T=0;for(J[T++]=this.m_root;T>
0;){v=J[--T];if(v.aabb.TestOverlap(t)!=false){x=v.aabb.GetCenter();C=v.aabb.GetExtents();if(!(Math.abs(r.x*(f.x-x.x)+r.y*(f.y-x.y))-s.x*C.x-s.y*C.y>0))if(v.IsLeaf()){x=new S;x.p1=e.p1;x.p2=e.p2;x.maxFraction=e.maxFraction;v=b(x,v);if(v==0)break;if(v>0){x=f.x+v*(m.x-f.x);C=f.y+v*(m.y-f.y);t.lowerBound.x=Math.min(f.x,x);t.lowerBound.y=Math.min(f.y,C);t.upperBound.x=Math.max(f.x,x);t.upperBound.y=Math.max(f.y,C)}}else{J[T++]=v.child1;J[T++]=v.child2}}}}};u.prototype.AllocateNode=function(){if(this.m_freeList){var b=
this.m_freeList;this.m_freeList=b.parent;b.parent=null;b.child1=null;b.child2=null;return b}return new H};u.prototype.FreeNode=function(b){b.parent=this.m_freeList;this.m_freeList=b};u.prototype.InsertLeaf=function(b){++this.m_insertionCount;if(this.m_root==null){this.m_root=b;this.m_root.parent=null}else{var e=b.aabb.GetCenter(),f=this.m_root;if(f.IsLeaf()==false){do{var m=f.child1;f=f.child2;f=Math.abs((m.aabb.lowerBound.x+m.aabb.upperBound.x)/2-e.x)+Math.abs((m.aabb.lowerBound.y+m.aabb.upperBound.y)/
2-e.y)<Math.abs((f.aabb.lowerBound.x+f.aabb.upperBound.x)/2-e.x)+Math.abs((f.aabb.lowerBound.y+f.aabb.upperBound.y)/2-e.y)?m:f}while(f.IsLeaf()==false)}e=f.parent;m=this.AllocateNode();m.parent=e;m.userData=null;m.aabb.Combine(b.aabb,f.aabb);if(e){if(f.parent.child1==f)e.child1=m;else e.child2=m;m.child1=f;m.child2=b;f.parent=m;b.parent=m;do{if(e.aabb.Contains(m.aabb))break;e.aabb.Combine(e.child1.aabb,e.child2.aabb);m=e;e=e.parent}while(e)}else{m.child1=f;m.child2=b;f.parent=m;this.m_root=b.parent=
m}}};u.prototype.RemoveLeaf=function(b){if(b==this.m_root)this.m_root=null;else{var e=b.parent,f=e.parent;b=e.child1==b?e.child2:e.child1;if(f){if(f.child1==e)f.child1=b;else f.child2=b;b.parent=f;for(this.FreeNode(e);f;){e=f.aabb;f.aabb=B.Combine(f.child1.aabb,f.child2.aabb);if(e.Contains(f.aabb))break;f=f.parent}}else{this.m_root=b;b.parent=null;this.FreeNode(e)}}};D.b2DynamicTreeBroadPhase=function(){this.m_tree=new u;this.m_moveBuffer=new Vector;this.m_pairBuffer=new Vector;this.m_pairCount=0};
D.prototype.CreateProxy=function(b,e){var f=this.m_tree.CreateProxy(b,e);++this.m_proxyCount;this.BufferMove(f);return f};D.prototype.DestroyProxy=function(b){this.UnBufferMove(b);--this.m_proxyCount;this.m_tree.DestroyProxy(b)};D.prototype.MoveProxy=function(b,e,f){this.m_tree.MoveProxy(b,e,f)&&this.BufferMove(b)};D.prototype.TestOverlap=function(b,e){var f=this.m_tree.GetFatAABB(b),m=this.m_tree.GetFatAABB(e);return f.TestOverlap(m)};D.prototype.GetUserData=function(b){return this.m_tree.GetUserData(b)};
D.prototype.GetFatAABB=function(b){return this.m_tree.GetFatAABB(b)};D.prototype.GetProxyCount=function(){return this.m_proxyCount};D.prototype.UpdatePairs=function(b){var e=this;var f=e.m_pairCount=0,m;for(f=0;f<e.m_moveBuffer.length;++f){m=e.m_moveBuffer[f];var r=e.m_tree.GetFatAABB(m);e.m_tree.Query(function(t){if(t==m)return true;if(e.m_pairCount==e.m_pairBuffer.length)e.m_pairBuffer[e.m_pairCount]=new O;var x=e.m_pairBuffer[e.m_pairCount];x.proxyA=t<m?t:m;x.proxyB=t>=m?t:m;++e.m_pairCount;return true},
r)}for(f=e.m_moveBuffer.length=0;f<e.m_pairCount;){r=e.m_pairBuffer[f];var s=e.m_tree.GetUserData(r.proxyA),v=e.m_tree.GetUserData(r.proxyB);b(s,v);for(++f;f<e.m_pairCount;){s=e.m_pairBuffer[f];if(s.proxyA!=r.proxyA||s.proxyB!=r.proxyB)break;++f}}};D.prototype.Query=function(b,e){this.m_tree.Query(b,e)};D.prototype.RayCast=function(b,e){this.m_tree.RayCast(b,e)};D.prototype.Validate=function(){};D.prototype.Rebalance=function(b){if(b===undefined)b=0;this.m_tree.Rebalance(b)};D.prototype.BufferMove=
function(b){this.m_moveBuffer[this.m_moveBuffer.length]=b};D.prototype.UnBufferMove=function(b){this.m_moveBuffer.splice(parseInt(this.m_moveBuffer.indexOf(b)),1)};D.prototype.ComparePairs=function(){return 0};D.__implements={};D.__implements[g]=true;H.b2DynamicTreeNode=function(){this.aabb=new B};H.prototype.IsLeaf=function(){return this.child1==null};O.b2DynamicTreePair=function(){};E.b2Manifold=function(){this.m_pointCount=0};E.prototype.b2Manifold=function(){this.m_points=new Vector(y.b2_maxManifoldPoints);
for(var b=0;b<y.b2_maxManifoldPoints;b++)this.m_points[b]=new R;this.m_localPlaneNormal=new p;this.m_localPoint=new p};E.prototype.Reset=function(){for(var b=0;b<y.b2_maxManifoldPoints;b++)(this.m_points[b]instanceof R?this.m_points[b]:null).Reset();this.m_localPlaneNormal.SetZero();this.m_localPoint.SetZero();this.m_pointCount=this.m_type=0};E.prototype.Set=function(b){this.m_pointCount=b.m_pointCount;for(var e=0;e<y.b2_maxManifoldPoints;e++)(this.m_points[e]instanceof R?this.m_points[e]:null).Set(b.m_points[e]);
this.m_localPlaneNormal.SetV(b.m_localPlaneNormal);this.m_localPoint.SetV(b.m_localPoint);this.m_type=b.m_type};E.prototype.Copy=function(){var b=new E;b.Set(this);return b};Box2D.postDefs.push(function(){Box2D.Collision.b2Manifold.e_circles=1;Box2D.Collision.b2Manifold.e_faceA=2;Box2D.Collision.b2Manifold.e_faceB=4});R.b2ManifoldPoint=function(){this.m_localPoint=new p;this.m_id=new L};R.prototype.b2ManifoldPoint=function(){this.Reset()};R.prototype.Reset=function(){this.m_localPoint.SetZero();this.m_tangentImpulse=
this.m_normalImpulse=0;this.m_id.key=0};R.prototype.Set=function(b){this.m_localPoint.SetV(b.m_localPoint);this.m_normalImpulse=b.m_normalImpulse;this.m_tangentImpulse=b.m_tangentImpulse;this.m_id.Set(b.m_id)};N.b2Point=function(){this.p=new p};N.prototype.Support=function(){return this.p};N.prototype.GetFirstVertex=function(){return this.p};S.b2RayCastInput=function(){this.p1=new p;this.p2=new p};S.prototype.b2RayCastInput=function(b,e,f){if(b===undefined)b=null;if(e===undefined)e=null;if(f===undefined)f=
1;b&&this.p1.SetV(b);e&&this.p2.SetV(e);this.maxFraction=f};aa.b2RayCastOutput=function(){this.normal=new p};Z.b2Segment=function(){this.p1=new p;this.p2=new p};Z.prototype.TestSegment=function(b,e,f,m){if(m===undefined)m=0;var r=f.p1,s=f.p2.x-r.x,v=f.p2.y-r.y;f=this.p2.y-this.p1.y;var t=-(this.p2.x-this.p1.x),x=100*Number.MIN_VALUE,C=-(s*f+v*t);if(C>x){var J=r.x-this.p1.x,T=r.y-this.p1.y;r=J*f+T*t;if(0<=r&&r<=m*C){m=-s*T+v*J;if(-x*C<=m&&m<=C*(1+x)){r/=C;m=Math.sqrt(f*f+t*t);f/=m;t/=m;b[0]=r;e.Set(f,
t);return true}}}return false};Z.prototype.Extend=function(b){this.ExtendForward(b);this.ExtendBackward(b)};Z.prototype.ExtendForward=function(b){var e=this.p2.x-this.p1.x,f=this.p2.y-this.p1.y;b=Math.min(e>0?(b.upperBound.x-this.p1.x)/e:e<0?(b.lowerBound.x-this.p1.x)/e:Number.POSITIVE_INFINITY,f>0?(b.upperBound.y-this.p1.y)/f:f<0?(b.lowerBound.y-this.p1.y)/f:Number.POSITIVE_INFINITY);this.p2.x=this.p1.x+e*b;this.p2.y=this.p1.y+f*b};Z.prototype.ExtendBackward=function(b){var e=-this.p2.x+this.p1.x,
f=-this.p2.y+this.p1.y;b=Math.min(e>0?(b.upperBound.x-this.p2.x)/e:e<0?(b.lowerBound.x-this.p2.x)/e:Number.POSITIVE_INFINITY,f>0?(b.upperBound.y-this.p2.y)/f:f<0?(b.lowerBound.y-this.p2.y)/f:Number.POSITIVE_INFINITY);this.p1.x=this.p2.x+e*b;this.p1.y=this.p2.y+f*b};d.b2SeparationFunction=function(){this.m_localPoint=new p;this.m_axis=new p};d.prototype.Initialize=function(b,e,f,m,r){this.m_proxyA=e;this.m_proxyB=m;var s=parseInt(b.count);y.b2Assert(0<s&&s<3);var v,t,x,C,J=C=x=m=e=0,T=0;J=0;if(s==
1){this.m_type=d.e_points;v=this.m_proxyA.GetVertex(b.indexA[0]);t=this.m_proxyB.GetVertex(b.indexB[0]);s=v;b=f.R;e=f.position.x+(b.col1.x*s.x+b.col2.x*s.y);m=f.position.y+(b.col1.y*s.x+b.col2.y*s.y);s=t;b=r.R;x=r.position.x+(b.col1.x*s.x+b.col2.x*s.y);C=r.position.y+(b.col1.y*s.x+b.col2.y*s.y);this.m_axis.x=x-e;this.m_axis.y=C-m;this.m_axis.Normalize()}else{if(b.indexB[0]==b.indexB[1]){this.m_type=d.e_faceA;e=this.m_proxyA.GetVertex(b.indexA[0]);m=this.m_proxyA.GetVertex(b.indexA[1]);t=this.m_proxyB.GetVertex(b.indexB[0]);
this.m_localPoint.x=0.5*(e.x+m.x);this.m_localPoint.y=0.5*(e.y+m.y);this.m_axis=w.CrossVF(w.SubtractVV(m,e),1);this.m_axis.Normalize();s=this.m_axis;b=f.R;J=b.col1.x*s.x+b.col2.x*s.y;T=b.col1.y*s.x+b.col2.y*s.y;s=this.m_localPoint;b=f.R;e=f.position.x+(b.col1.x*s.x+b.col2.x*s.y);m=f.position.y+(b.col1.y*s.x+b.col2.y*s.y);s=t;b=r.R;x=r.position.x+(b.col1.x*s.x+b.col2.x*s.y);C=r.position.y+(b.col1.y*s.x+b.col2.y*s.y);J=(x-e)*J+(C-m)*T}else if(b.indexA[0]==b.indexA[0]){this.m_type=d.e_faceB;x=this.m_proxyB.GetVertex(b.indexB[0]);
C=this.m_proxyB.GetVertex(b.indexB[1]);v=this.m_proxyA.GetVertex(b.indexA[0]);this.m_localPoint.x=0.5*(x.x+C.x);this.m_localPoint.y=0.5*(x.y+C.y);this.m_axis=w.CrossVF(w.SubtractVV(C,x),1);this.m_axis.Normalize();s=this.m_axis;b=r.R;J=b.col1.x*s.x+b.col2.x*s.y;T=b.col1.y*s.x+b.col2.y*s.y;s=this.m_localPoint;b=r.R;x=r.position.x+(b.col1.x*s.x+b.col2.x*s.y);C=r.position.y+(b.col1.y*s.x+b.col2.y*s.y);s=v;b=f.R;e=f.position.x+(b.col1.x*s.x+b.col2.x*s.y);m=f.position.y+(b.col1.y*s.x+b.col2.y*s.y);J=(e-
x)*J+(m-C)*T}else{e=this.m_proxyA.GetVertex(b.indexA[0]);m=this.m_proxyA.GetVertex(b.indexA[1]);x=this.m_proxyB.GetVertex(b.indexB[0]);C=this.m_proxyB.GetVertex(b.indexB[1]);w.MulX(f,v);v=w.MulMV(f.R,w.SubtractVV(m,e));w.MulX(r,t);J=w.MulMV(r.R,w.SubtractVV(C,x));r=v.x*v.x+v.y*v.y;t=J.x*J.x+J.y*J.y;b=w.SubtractVV(J,v);f=v.x*b.x+v.y*b.y;b=J.x*b.x+J.y*b.y;v=v.x*J.x+v.y*J.y;T=r*t-v*v;J=0;if(T!=0)J=w.Clamp((v*b-f*t)/T,0,1);if((v*J+b)/t<0)J=w.Clamp((v-f)/r,0,1);v=new p;v.x=e.x+J*(m.x-e.x);v.y=e.y+J*(m.y-
e.y);t=new p;t.x=x.x+J*(C.x-x.x);t.y=x.y+J*(C.y-x.y);if(J==0||J==1){this.m_type=d.e_faceB;this.m_axis=w.CrossVF(w.SubtractVV(C,x),1);this.m_axis.Normalize();this.m_localPoint=t}else{this.m_type=d.e_faceA;this.m_axis=w.CrossVF(w.SubtractVV(m,e),1);this.m_localPoint=v}}J<0&&this.m_axis.NegativeSelf()}};d.prototype.Evaluate=function(b,e){var f,m,r=0;switch(this.m_type){case d.e_points:f=w.MulTMV(b.R,this.m_axis);m=w.MulTMV(e.R,this.m_axis.GetNegative());f=this.m_proxyA.GetSupportVertex(f);m=this.m_proxyB.GetSupportVertex(m);
f=w.MulX(b,f);m=w.MulX(e,m);return r=(m.x-f.x)*this.m_axis.x+(m.y-f.y)*this.m_axis.y;case d.e_faceA:r=w.MulMV(b.R,this.m_axis);f=w.MulX(b,this.m_localPoint);m=w.MulTMV(e.R,r.GetNegative());m=this.m_proxyB.GetSupportVertex(m);m=w.MulX(e,m);return r=(m.x-f.x)*r.x+(m.y-f.y)*r.y;case d.e_faceB:r=w.MulMV(e.R,this.m_axis);m=w.MulX(e,this.m_localPoint);f=w.MulTMV(b.R,r.GetNegative());f=this.m_proxyA.GetSupportVertex(f);f=w.MulX(b,f);return r=(f.x-m.x)*r.x+(f.y-m.y)*r.y;default:y.b2Assert(false);return 0}};
Box2D.postDefs.push(function(){Box2D.Collision.b2SeparationFunction.e_points=1;Box2D.Collision.b2SeparationFunction.e_faceA=2;Box2D.Collision.b2SeparationFunction.e_faceB=4});h.b2Simplex=function(){this.m_v1=new j;this.m_v2=new j;this.m_v3=new j;this.m_vertices=new Vector(3)};h.prototype.b2Simplex=function(){this.m_vertices[0]=this.m_v1;this.m_vertices[1]=this.m_v2;this.m_vertices[2]=this.m_v3};h.prototype.ReadCache=function(b,e,f,m,r){y.b2Assert(0<=b.count&&b.count<=3);var s,v;this.m_count=b.count;
for(var t=this.m_vertices,x=0;x<this.m_count;x++){var C=t[x];C.indexA=b.indexA[x];C.indexB=b.indexB[x];s=e.GetVertex(C.indexA);v=m.GetVertex(C.indexB);C.wA=w.MulX(f,s);C.wB=w.MulX(r,v);C.w=w.SubtractVV(C.wB,C.wA);C.a=0}if(this.m_count>1){b=b.metric;s=this.GetMetric();if(s<0.5*b||2*b<s||s<Number.MIN_VALUE)this.m_count=0}if(this.m_count==0){C=t[0];C.indexA=0;C.indexB=0;s=e.GetVertex(0);v=m.GetVertex(0);C.wA=w.MulX(f,s);C.wB=w.MulX(r,v);C.w=w.SubtractVV(C.wB,C.wA);this.m_count=1}};h.prototype.WriteCache=
function(b){b.metric=this.GetMetric();b.count=Box2D.parseUInt(this.m_count);for(var e=this.m_vertices,f=0;f<this.m_count;f++){b.indexA[f]=Box2D.parseUInt(e[f].indexA);b.indexB[f]=Box2D.parseUInt(e[f].indexB)}};h.prototype.GetSearchDirection=function(){switch(this.m_count){case 1:return this.m_v1.w.GetNegative();case 2:var b=w.SubtractVV(this.m_v2.w,this.m_v1.w);return w.CrossVV(b,this.m_v1.w.GetNegative())>0?w.CrossFV(1,b):w.CrossVF(b,1);default:y.b2Assert(false);return new p}};h.prototype.GetClosestPoint=
function(){switch(this.m_count){case 0:y.b2Assert(false);return new p;case 1:return this.m_v1.w;case 2:return new p(this.m_v1.a*this.m_v1.w.x+this.m_v2.a*this.m_v2.w.x,this.m_v1.a*this.m_v1.w.y+this.m_v2.a*this.m_v2.w.y);default:y.b2Assert(false);return new p}};h.prototype.GetWitnessPoints=function(b,e){switch(this.m_count){case 0:y.b2Assert(false);break;case 1:b.SetV(this.m_v1.wA);e.SetV(this.m_v1.wB);break;case 2:b.x=this.m_v1.a*this.m_v1.wA.x+this.m_v2.a*this.m_v2.wA.x;b.y=this.m_v1.a*this.m_v1.wA.y+
this.m_v2.a*this.m_v2.wA.y;e.x=this.m_v1.a*this.m_v1.wB.x+this.m_v2.a*this.m_v2.wB.x;e.y=this.m_v1.a*this.m_v1.wB.y+this.m_v2.a*this.m_v2.wB.y;break;case 3:e.x=b.x=this.m_v1.a*this.m_v1.wA.x+this.m_v2.a*this.m_v2.wA.x+this.m_v3.a*this.m_v3.wA.x;e.y=b.y=this.m_v1.a*this.m_v1.wA.y+this.m_v2.a*this.m_v2.wA.y+this.m_v3.a*this.m_v3.wA.y;break;default:y.b2Assert(false)}};h.prototype.GetMetric=function(){switch(this.m_count){case 0:y.b2Assert(false);return 0;case 1:return 0;case 2:return w.SubtractVV(this.m_v1.w,
this.m_v2.w).Length();case 3:return w.CrossVV(w.SubtractVV(this.m_v2.w,this.m_v1.w),w.SubtractVV(this.m_v3.w,this.m_v1.w));default:y.b2Assert(false);return 0}};h.prototype.Solve2=function(){var b=this.m_v1.w,e=this.m_v2.w,f=w.SubtractVV(e,b);b=-(b.x*f.x+b.y*f.y);if(b<=0)this.m_count=this.m_v1.a=1;else{e=e.x*f.x+e.y*f.y;if(e<=0){this.m_count=this.m_v2.a=1;this.m_v1.Set(this.m_v2)}else{f=1/(e+b);this.m_v1.a=e*f;this.m_v2.a=b*f;this.m_count=2}}};h.prototype.Solve3=function(){var b=this.m_v1.w,e=this.m_v2.w,
f=this.m_v3.w,m=w.SubtractVV(e,b),r=w.Dot(b,m),s=w.Dot(e,m);r=-r;var v=w.SubtractVV(f,b),t=w.Dot(b,v),x=w.Dot(f,v);t=-t;var C=w.SubtractVV(f,e),J=w.Dot(e,C);C=w.Dot(f,C);J=-J;v=w.CrossVV(m,v);m=v*w.CrossVV(e,f);f=v*w.CrossVV(f,b);b=v*w.CrossVV(b,e);if(r<=0&&t<=0)this.m_count=this.m_v1.a=1;else if(s>0&&r>0&&b<=0){x=1/(s+r);this.m_v1.a=s*x;this.m_v2.a=r*x;this.m_count=2}else if(x>0&&t>0&&f<=0){s=1/(x+t);this.m_v1.a=x*s;this.m_v3.a=t*s;this.m_count=2;this.m_v2.Set(this.m_v3)}else if(s<=0&&J<=0){this.m_count=
this.m_v2.a=1;this.m_v1.Set(this.m_v2)}else if(x<=0&&C<=0){this.m_count=this.m_v3.a=1;this.m_v1.Set(this.m_v3)}else if(C>0&&J>0&&m<=0){s=1/(C+J);this.m_v2.a=C*s;this.m_v3.a=J*s;this.m_count=2;this.m_v1.Set(this.m_v3)}else{s=1/(m+f+b);this.m_v1.a=m*s;this.m_v2.a=f*s;this.m_v3.a=b*s;this.m_count=3}};l.b2SimplexCache=function(){this.indexA=new Vector_a2j_Number(3);this.indexB=new Vector_a2j_Number(3)};j.b2SimplexVertex=function(){};j.prototype.Set=function(b){this.wA.SetV(b.wA);this.wB.SetV(b.wB);this.w.SetV(b.w);
this.a=b.a;this.indexA=b.indexA;this.indexB=b.indexB};o.b2TimeOfImpact=function(){};o.TimeOfImpact=function(b){++o.b2_toiCalls;var e=b.proxyA,f=b.proxyB,m=b.sweepA,r=b.sweepB;y.b2Assert(m.t0==r.t0);y.b2Assert(1-m.t0>Number.MIN_VALUE);var s=e.m_radius+f.m_radius;b=b.tolerance;var v=0,t=0,x=0;o.s_cache.count=0;for(o.s_distanceInput.useRadii=false;;){m.GetTransform(o.s_xfA,v);r.GetTransform(o.s_xfB,v);o.s_distanceInput.proxyA=e;o.s_distanceInput.proxyB=f;o.s_distanceInput.transformA=o.s_xfA;o.s_distanceInput.transformB=
o.s_xfB;W.Distance(o.s_distanceOutput,o.s_cache,o.s_distanceInput);if(o.s_distanceOutput.distance<=0){v=1;break}o.s_fcn.Initialize(o.s_cache,e,o.s_xfA,f,o.s_xfB);var C=o.s_fcn.Evaluate(o.s_xfA,o.s_xfB);if(C<=0){v=1;break}if(t==0)x=C>s?w.Max(s-b,0.75*s):w.Max(C-b,0.02*s);if(C-x<0.5*b){if(t==0){v=1;break}break}var J=v,T=v,P=1;C=C;m.GetTransform(o.s_xfA,P);r.GetTransform(o.s_xfB,P);var X=o.s_fcn.Evaluate(o.s_xfA,o.s_xfB);if(X>=x){v=1;break}for(var $=0;;){var ba=0;ba=$&1?T+(x-C)*(P-T)/(X-C):0.5*(T+P);
m.GetTransform(o.s_xfA,ba);r.GetTransform(o.s_xfB,ba);var ca=o.s_fcn.Evaluate(o.s_xfA,o.s_xfB);if(w.Abs(ca-x)<0.025*b){J=ba;break}if(ca>x){T=ba;C=ca}else{P=ba;X=ca}++$;++o.b2_toiRootIters;if($==50)break}o.b2_toiMaxRootIters=w.Max(o.b2_toiMaxRootIters,$);if(J<(1+100*Number.MIN_VALUE)*v)break;v=J;t++;++o.b2_toiIters;if(t==1E3)break}o.b2_toiMaxIters=w.Max(o.b2_toiMaxIters,t);return v};Box2D.postDefs.push(function(){Box2D.Collision.b2TimeOfImpact.b2_toiCalls=0;Box2D.Collision.b2TimeOfImpact.b2_toiIters=
0;Box2D.Collision.b2TimeOfImpact.b2_toiMaxIters=0;Box2D.Collision.b2TimeOfImpact.b2_toiRootIters=0;Box2D.Collision.b2TimeOfImpact.b2_toiMaxRootIters=0;Box2D.Collision.b2TimeOfImpact.s_cache=new l;Box2D.Collision.b2TimeOfImpact.s_distanceInput=new Y;Box2D.Collision.b2TimeOfImpact.s_xfA=new U;Box2D.Collision.b2TimeOfImpact.s_xfB=new U;Box2D.Collision.b2TimeOfImpact.s_fcn=new d;Box2D.Collision.b2TimeOfImpact.s_distanceOutput=new k});q.b2TOIInput=function(){this.proxyA=new z;this.proxyB=new z;this.sweepA=
new A;this.sweepB=new A};n.b2WorldManifold=function(){this.m_normal=new p};n.prototype.b2WorldManifold=function(){this.m_points=new Vector(y.b2_maxManifoldPoints);for(var b=0;b<y.b2_maxManifoldPoints;b++)this.m_points[b]=new p};n.prototype.Initialize=function(b,e,f,m,r){if(f===undefined)f=0;if(r===undefined)r=0;if(b.m_pointCount!=0){var s=0,v,t,x=0,C=0,J=0,T=0,P=0;v=0;switch(b.m_type){case E.e_circles:t=e.R;v=b.m_localPoint;s=e.position.x+t.col1.x*v.x+t.col2.x*v.y;e=e.position.y+t.col1.y*v.x+t.col2.y*
v.y;t=m.R;v=b.m_points[0].m_localPoint;b=m.position.x+t.col1.x*v.x+t.col2.x*v.y;m=m.position.y+t.col1.y*v.x+t.col2.y*v.y;v=b-s;t=m-e;x=v*v+t*t;if(x>Number.MIN_VALUE*Number.MIN_VALUE){x=Math.sqrt(x);this.m_normal.x=v/x;this.m_normal.y=t/x}else{this.m_normal.x=1;this.m_normal.y=0}v=e+f*this.m_normal.y;m=m-r*this.m_normal.y;this.m_points[0].x=0.5*(s+f*this.m_normal.x+(b-r*this.m_normal.x));this.m_points[0].y=0.5*(v+m);break;case E.e_faceA:t=e.R;v=b.m_localPlaneNormal;x=t.col1.x*v.x+t.col2.x*v.y;C=t.col1.y*
v.x+t.col2.y*v.y;t=e.R;v=b.m_localPoint;J=e.position.x+t.col1.x*v.x+t.col2.x*v.y;T=e.position.y+t.col1.y*v.x+t.col2.y*v.y;this.m_normal.x=x;this.m_normal.y=C;for(s=0;s<b.m_pointCount;s++){t=m.R;v=b.m_points[s].m_localPoint;P=m.position.x+t.col1.x*v.x+t.col2.x*v.y;v=m.position.y+t.col1.y*v.x+t.col2.y*v.y;this.m_points[s].x=P+0.5*(f-(P-J)*x-(v-T)*C-r)*x;this.m_points[s].y=v+0.5*(f-(P-J)*x-(v-T)*C-r)*C}break;case E.e_faceB:t=m.R;v=b.m_localPlaneNormal;x=t.col1.x*v.x+t.col2.x*v.y;C=t.col1.y*v.x+t.col2.y*
v.y;t=m.R;v=b.m_localPoint;J=m.position.x+t.col1.x*v.x+t.col2.x*v.y;T=m.position.y+t.col1.y*v.x+t.col2.y*v.y;this.m_normal.x=-x;this.m_normal.y=-C;for(s=0;s<b.m_pointCount;s++){t=e.R;v=b.m_points[s].m_localPoint;P=e.position.x+t.col1.x*v.x+t.col2.x*v.y;v=e.position.y+t.col1.y*v.x+t.col2.y*v.y;this.m_points[s].x=P+0.5*(r-(P-J)*x-(v-T)*C-f)*x;this.m_points[s].y=v+0.5*(r-(P-J)*x-(v-T)*C-f)*C}}}};a.ClipVertex=function(){this.v=new p;this.id=new L};a.prototype.Set=function(b){this.v.SetV(b.v);this.id.Set(b.id)};
c.Features=function(){};Object.defineProperty(c.prototype,"referenceEdge",{enumerable:false,configurable:true,get:function(){return this._referenceEdge}});Object.defineProperty(c.prototype,"referenceEdge",{enumerable:false,configurable:true,set:function(b){if(b===undefined)b=0;this._referenceEdge=b;this._m_id._key=this._m_id._key&4294967040|this._referenceEdge&255}});Object.defineProperty(c.prototype,"incidentEdge",{enumerable:false,configurable:true,get:function(){return this._incidentEdge}});Object.defineProperty(c.prototype,
"incidentEdge",{enumerable:false,configurable:true,set:function(b){if(b===undefined)b=0;this._incidentEdge=b;this._m_id._key=this._m_id._key&4294902015|this._incidentEdge<<8&65280}});Object.defineProperty(c.prototype,"incidentVertex",{enumerable:false,configurable:true,get:function(){return this._incidentVertex}});Object.defineProperty(c.prototype,"incidentVertex",{enumerable:false,configurable:true,set:function(b){if(b===undefined)b=0;this._incidentVertex=b;this._m_id._key=this._m_id._key&4278255615|
this._incidentVertex<<16&16711680}});Object.defineProperty(c.prototype,"flip",{enumerable:false,configurable:true,get:function(){return this._flip}});Object.defineProperty(c.prototype,"flip",{enumerable:false,configurable:true,set:function(b){if(b===undefined)b=0;this._flip=b;this._m_id._key=this._m_id._key&16777215|this._flip<<24&4278190080}})})();
(function(){var F=Box2D.Common.b2Settings,G=Box2D.Collision.Shapes.b2CircleShape,K=Box2D.Collision.Shapes.b2EdgeChainDef,y=Box2D.Collision.Shapes.b2EdgeShape,w=Box2D.Collision.Shapes.b2MassData,A=Box2D.Collision.Shapes.b2PolygonShape,U=Box2D.Collision.Shapes.b2Shape,p=Box2D.Common.Math.b2Mat22,B=Box2D.Common.Math.b2Math,Q=Box2D.Common.Math.b2Transform,V=Box2D.Common.Math.b2Vec2,M=Box2D.Collision.b2Distance,L=Box2D.Collision.b2DistanceInput,I=Box2D.Collision.b2DistanceOutput,W=Box2D.Collision.b2DistanceProxy,
Y=Box2D.Collision.b2SimplexCache;Box2D.inherit(G,Box2D.Collision.Shapes.b2Shape);G.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;G.b2CircleShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments);this.m_p=new V};G.prototype.Copy=function(){var k=new G;k.Set(this);return k};G.prototype.Set=function(k){this.__super.Set.call(this,k);if(Box2D.is(k,G))this.m_p.SetV((k instanceof G?k:null).m_p)};G.prototype.TestPoint=function(k,z){var u=k.R,D=k.position.x+(u.col1.x*this.m_p.x+
u.col2.x*this.m_p.y);u=k.position.y+(u.col1.y*this.m_p.x+u.col2.y*this.m_p.y);D=z.x-D;u=z.y-u;return D*D+u*u<=this.m_radius*this.m_radius};G.prototype.RayCast=function(k,z,u){var D=u.R,H=z.p1.x-(u.position.x+(D.col1.x*this.m_p.x+D.col2.x*this.m_p.y));u=z.p1.y-(u.position.y+(D.col1.y*this.m_p.x+D.col2.y*this.m_p.y));D=z.p2.x-z.p1.x;var O=z.p2.y-z.p1.y,E=H*D+u*O,R=D*D+O*O,N=E*E-R*(H*H+u*u-this.m_radius*this.m_radius);if(N<0||R<Number.MIN_VALUE)return false;E=-(E+Math.sqrt(N));if(0<=E&&E<=z.maxFraction*
R){E/=R;k.fraction=E;k.normal.x=H+E*D;k.normal.y=u+E*O;k.normal.Normalize();return true}return false};G.prototype.ComputeAABB=function(k,z){var u=z.R,D=z.position.x+(u.col1.x*this.m_p.x+u.col2.x*this.m_p.y);u=z.position.y+(u.col1.y*this.m_p.x+u.col2.y*this.m_p.y);k.lowerBound.Set(D-this.m_radius,u-this.m_radius);k.upperBound.Set(D+this.m_radius,u+this.m_radius)};G.prototype.ComputeMass=function(k,z){if(z===undefined)z=0;k.mass=z*F.b2_pi*this.m_radius*this.m_radius;k.center.SetV(this.m_p);k.I=k.mass*
(0.5*this.m_radius*this.m_radius+(this.m_p.x*this.m_p.x+this.m_p.y*this.m_p.y))};G.prototype.ComputeSubmergedArea=function(k,z,u,D){if(z===undefined)z=0;u=B.MulX(u,this.m_p);var H=-(B.Dot(k,u)-z);if(H<-this.m_radius+Number.MIN_VALUE)return 0;if(H>this.m_radius){D.SetV(u);return Math.PI*this.m_radius*this.m_radius}z=this.m_radius*this.m_radius;var O=H*H;H=z*(Math.asin(H/this.m_radius)+Math.PI/2)+H*Math.sqrt(z-O);z=-2/3*Math.pow(z-O,1.5)/H;D.x=u.x+k.x*z;D.y=u.y+k.y*z;return H};G.prototype.GetLocalPosition=
function(){return this.m_p};G.prototype.SetLocalPosition=function(k){this.m_p.SetV(k)};G.prototype.GetRadius=function(){return this.m_radius};G.prototype.SetRadius=function(k){if(k===undefined)k=0;this.m_radius=k};G.prototype.b2CircleShape=function(k){if(k===undefined)k=0;this.__super.b2Shape.call(this);this.m_type=U.e_circleShape;this.m_radius=k};K.b2EdgeChainDef=function(){};K.prototype.b2EdgeChainDef=function(){this.vertexCount=0;this.isALoop=true;this.vertices=[]};Box2D.inherit(y,Box2D.Collision.Shapes.b2Shape);
y.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;y.b2EdgeShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments);this.s_supportVec=new V;this.m_v1=new V;this.m_v2=new V;this.m_coreV1=new V;this.m_coreV2=new V;this.m_normal=new V;this.m_direction=new V;this.m_cornerDir1=new V;this.m_cornerDir2=new V};y.prototype.TestPoint=function(){return false};y.prototype.RayCast=function(k,z,u){var D,H=z.p2.x-z.p1.x,O=z.p2.y-z.p1.y;D=u.R;var E=u.position.x+(D.col1.x*this.m_v1.x+
D.col2.x*this.m_v1.y),R=u.position.y+(D.col1.y*this.m_v1.x+D.col2.y*this.m_v1.y),N=u.position.y+(D.col1.y*this.m_v2.x+D.col2.y*this.m_v2.y)-R;u=-(u.position.x+(D.col1.x*this.m_v2.x+D.col2.x*this.m_v2.y)-E);D=100*Number.MIN_VALUE;var S=-(H*N+O*u);if(S>D){E=z.p1.x-E;var aa=z.p1.y-R;R=E*N+aa*u;if(0<=R&&R<=z.maxFraction*S){z=-H*aa+O*E;if(-D*S<=z&&z<=S*(1+D)){R/=S;k.fraction=R;z=Math.sqrt(N*N+u*u);k.normal.x=N/z;k.normal.y=u/z;return true}}}return false};y.prototype.ComputeAABB=function(k,z){var u=z.R,
D=z.position.x+(u.col1.x*this.m_v1.x+u.col2.x*this.m_v1.y),H=z.position.y+(u.col1.y*this.m_v1.x+u.col2.y*this.m_v1.y),O=z.position.x+(u.col1.x*this.m_v2.x+u.col2.x*this.m_v2.y);u=z.position.y+(u.col1.y*this.m_v2.x+u.col2.y*this.m_v2.y);if(D<O){k.lowerBound.x=D;k.upperBound.x=O}else{k.lowerBound.x=O;k.upperBound.x=D}if(H<u){k.lowerBound.y=H;k.upperBound.y=u}else{k.lowerBound.y=u;k.upperBound.y=H}};y.prototype.ComputeMass=function(k){k.mass=0;k.center.SetV(this.m_v1);k.I=0};y.prototype.ComputeSubmergedArea=
function(k,z,u,D){if(z===undefined)z=0;var H=new V(k.x*z,k.y*z),O=B.MulX(u,this.m_v1);u=B.MulX(u,this.m_v2);var E=B.Dot(k,O)-z;k=B.Dot(k,u)-z;if(E>0)if(k>0)return 0;else{O.x=-k/(E-k)*O.x+E/(E-k)*u.x;O.y=-k/(E-k)*O.y+E/(E-k)*u.y}else if(k>0){u.x=-k/(E-k)*O.x+E/(E-k)*u.x;u.y=-k/(E-k)*O.y+E/(E-k)*u.y}D.x=(H.x+O.x+u.x)/3;D.y=(H.y+O.y+u.y)/3;return 0.5*((O.x-H.x)*(u.y-H.y)-(O.y-H.y)*(u.x-H.x))};y.prototype.GetLength=function(){return this.m_length};y.prototype.GetVertex1=function(){return this.m_v1};y.prototype.GetVertex2=
function(){return this.m_v2};y.prototype.GetCoreVertex1=function(){return this.m_coreV1};y.prototype.GetCoreVertex2=function(){return this.m_coreV2};y.prototype.GetNormalVector=function(){return this.m_normal};y.prototype.GetDirectionVector=function(){return this.m_direction};y.prototype.GetCorner1Vector=function(){return this.m_cornerDir1};y.prototype.GetCorner2Vector=function(){return this.m_cornerDir2};y.prototype.Corner1IsConvex=function(){return this.m_cornerConvex1};y.prototype.Corner2IsConvex=
function(){return this.m_cornerConvex2};y.prototype.GetFirstVertex=function(k){var z=k.R;return new V(k.position.x+(z.col1.x*this.m_coreV1.x+z.col2.x*this.m_coreV1.y),k.position.y+(z.col1.y*this.m_coreV1.x+z.col2.y*this.m_coreV1.y))};y.prototype.GetNextEdge=function(){return this.m_nextEdge};y.prototype.GetPrevEdge=function(){return this.m_prevEdge};y.prototype.Support=function(k,z,u){if(z===undefined)z=0;if(u===undefined)u=0;var D=k.R,H=k.position.x+(D.col1.x*this.m_coreV1.x+D.col2.x*this.m_coreV1.y),
O=k.position.y+(D.col1.y*this.m_coreV1.x+D.col2.y*this.m_coreV1.y),E=k.position.x+(D.col1.x*this.m_coreV2.x+D.col2.x*this.m_coreV2.y);k=k.position.y+(D.col1.y*this.m_coreV2.x+D.col2.y*this.m_coreV2.y);if(H*z+O*u>E*z+k*u){this.s_supportVec.x=H;this.s_supportVec.y=O}else{this.s_supportVec.x=E;this.s_supportVec.y=k}return this.s_supportVec};y.prototype.b2EdgeShape=function(k,z){this.__super.b2Shape.call(this);this.m_type=U.e_edgeShape;this.m_nextEdge=this.m_prevEdge=null;this.m_v1=k;this.m_v2=z;this.m_direction.Set(this.m_v2.x-
this.m_v1.x,this.m_v2.y-this.m_v1.y);this.m_length=this.m_direction.Normalize();this.m_normal.Set(this.m_direction.y,-this.m_direction.x);this.m_coreV1.Set(-F.b2_toiSlop*(this.m_normal.x-this.m_direction.x)+this.m_v1.x,-F.b2_toiSlop*(this.m_normal.y-this.m_direction.y)+this.m_v1.y);this.m_coreV2.Set(-F.b2_toiSlop*(this.m_normal.x+this.m_direction.x)+this.m_v2.x,-F.b2_toiSlop*(this.m_normal.y+this.m_direction.y)+this.m_v2.y);this.m_cornerDir1=this.m_normal;this.m_cornerDir2.Set(-this.m_normal.x,-this.m_normal.y)};
y.prototype.SetPrevEdge=function(k,z,u,D){this.m_prevEdge=k;this.m_coreV1=z;this.m_cornerDir1=u;this.m_cornerConvex1=D};y.prototype.SetNextEdge=function(k,z,u,D){this.m_nextEdge=k;this.m_coreV2=z;this.m_cornerDir2=u;this.m_cornerConvex2=D};w.b2MassData=function(){this.mass=0;this.center=new V(0,0);this.I=0};Box2D.inherit(A,Box2D.Collision.Shapes.b2Shape);A.prototype.__super=Box2D.Collision.Shapes.b2Shape.prototype;A.b2PolygonShape=function(){Box2D.Collision.Shapes.b2Shape.b2Shape.apply(this,arguments)};
A.prototype.Copy=function(){var k=new A;k.Set(this);return k};A.prototype.Set=function(k){this.__super.Set.call(this,k);if(Box2D.is(k,A)){k=k instanceof A?k:null;this.m_centroid.SetV(k.m_centroid);this.m_vertexCount=k.m_vertexCount;this.Reserve(this.m_vertexCount);for(var z=0;z<this.m_vertexCount;z++){this.m_vertices[z].SetV(k.m_vertices[z]);this.m_normals[z].SetV(k.m_normals[z])}}};A.prototype.SetAsArray=function(k,z){if(z===undefined)z=0;var u=new Vector,D=0,H;for(D=0;D<k.length;++D){H=k[D];u.push(H)}this.SetAsVector(u,
z)};A.AsArray=function(k,z){if(z===undefined)z=0;var u=new A;u.SetAsArray(k,z);return u};A.prototype.SetAsVector=function(k,z){if(z===undefined)z=0;if(z==0)z=k.length;F.b2Assert(2<=z);this.m_vertexCount=z;this.Reserve(z);var u=0;for(u=0;u<this.m_vertexCount;u++)this.m_vertices[u].SetV(k[u]);for(u=0;u<this.m_vertexCount;++u){var D=parseInt(u),H=parseInt(u+1<this.m_vertexCount?u+1:0);D=B.SubtractVV(this.m_vertices[H],this.m_vertices[D]);F.b2Assert(D.LengthSquared()>Number.MIN_VALUE);this.m_normals[u].SetV(B.CrossVF(D,
1));this.m_normals[u].Normalize()}this.m_centroid=A.ComputeCentroid(this.m_vertices,this.m_vertexCount)};A.AsVector=function(k,z){if(z===undefined)z=0;var u=new A;u.SetAsVector(k,z);return u};A.prototype.SetAsBox=function(k,z){if(k===undefined)k=0;if(z===undefined)z=0;this.m_vertexCount=4;this.Reserve(4);this.m_vertices[0].Set(-k,-z);this.m_vertices[1].Set(k,-z);this.m_vertices[2].Set(k,z);this.m_vertices[3].Set(-k,z);this.m_normals[0].Set(0,-1);this.m_normals[1].Set(1,0);this.m_normals[2].Set(0,
1);this.m_normals[3].Set(-1,0);this.m_centroid.SetZero()};A.AsBox=function(k,z){if(k===undefined)k=0;if(z===undefined)z=0;var u=new A;u.SetAsBox(k,z);return u};A.prototype.SetAsOrientedBox=function(k,z,u,D){if(k===undefined)k=0;if(z===undefined)z=0;if(u===undefined)u=null;if(D===undefined)D=0;this.m_vertexCount=4;this.Reserve(4);this.m_vertices[0].Set(-k,-z);this.m_vertices[1].Set(k,-z);this.m_vertices[2].Set(k,z);this.m_vertices[3].Set(-k,z);this.m_normals[0].Set(0,-1);this.m_normals[1].Set(1,0);
this.m_normals[2].Set(0,1);this.m_normals[3].Set(-1,0);this.m_centroid=u;k=new Q;k.position=u;k.R.Set(D);for(u=0;u<this.m_vertexCount;++u){this.m_vertices[u]=B.MulX(k,this.m_vertices[u]);this.m_normals[u]=B.MulMV(k.R,this.m_normals[u])}};A.AsOrientedBox=function(k,z,u,D){if(k===undefined)k=0;if(z===undefined)z=0;if(u===undefined)u=null;if(D===undefined)D=0;var H=new A;H.SetAsOrientedBox(k,z,u,D);return H};A.prototype.SetAsEdge=function(k,z){this.m_vertexCount=2;this.Reserve(2);this.m_vertices[0].SetV(k);
this.m_vertices[1].SetV(z);this.m_centroid.x=0.5*(k.x+z.x);this.m_centroid.y=0.5*(k.y+z.y);this.m_normals[0]=B.CrossVF(B.SubtractVV(z,k),1);this.m_normals[0].Normalize();this.m_normals[1].x=-this.m_normals[0].x;this.m_normals[1].y=-this.m_normals[0].y};A.AsEdge=function(k,z){var u=new A;u.SetAsEdge(k,z);return u};A.prototype.TestPoint=function(k,z){var u;u=k.R;for(var D=z.x-k.position.x,H=z.y-k.position.y,O=D*u.col1.x+H*u.col1.y,E=D*u.col2.x+H*u.col2.y,R=0;R<this.m_vertexCount;++R){u=this.m_vertices[R];
D=O-u.x;H=E-u.y;u=this.m_normals[R];if(u.x*D+u.y*H>0)return false}return true};A.prototype.RayCast=function(k,z,u){var D=0,H=z.maxFraction,O=0,E=0,R,N;O=z.p1.x-u.position.x;E=z.p1.y-u.position.y;R=u.R;var S=O*R.col1.x+E*R.col1.y,aa=O*R.col2.x+E*R.col2.y;O=z.p2.x-u.position.x;E=z.p2.y-u.position.y;R=u.R;z=O*R.col1.x+E*R.col1.y-S;R=O*R.col2.x+E*R.col2.y-aa;for(var Z=parseInt(-1),d=0;d<this.m_vertexCount;++d){N=this.m_vertices[d];O=N.x-S;E=N.y-aa;N=this.m_normals[d];O=N.x*O+N.y*E;E=N.x*z+N.y*R;if(E==
0){if(O<0)return false}else if(E<0&&O<D*E){D=O/E;Z=d}else if(E>0&&O<H*E)H=O/E;if(H<D-Number.MIN_VALUE)return false}if(Z>=0){k.fraction=D;R=u.R;N=this.m_normals[Z];k.normal.x=R.col1.x*N.x+R.col2.x*N.y;k.normal.y=R.col1.y*N.x+R.col2.y*N.y;return true}return false};A.prototype.ComputeAABB=function(k,z){for(var u=z.R,D=this.m_vertices[0],H=z.position.x+(u.col1.x*D.x+u.col2.x*D.y),O=z.position.y+(u.col1.y*D.x+u.col2.y*D.y),E=H,R=O,N=1;N<this.m_vertexCount;++N){D=this.m_vertices[N];var S=z.position.x+(u.col1.x*
D.x+u.col2.x*D.y);D=z.position.y+(u.col1.y*D.x+u.col2.y*D.y);H=H<S?H:S;O=O<D?O:D;E=E>S?E:S;R=R>D?R:D}k.lowerBound.x=H-this.m_radius;k.lowerBound.y=O-this.m_radius;k.upperBound.x=E+this.m_radius;k.upperBound.y=R+this.m_radius};A.prototype.ComputeMass=function(k,z){if(z===undefined)z=0;if(this.m_vertexCount==2){k.center.x=0.5*(this.m_vertices[0].x+this.m_vertices[1].x);k.center.y=0.5*(this.m_vertices[0].y+this.m_vertices[1].y);k.mass=0;k.I=0}else{for(var u=0,D=0,H=0,O=0,E=1/3,R=0;R<this.m_vertexCount;++R){var N=
this.m_vertices[R],S=R+1<this.m_vertexCount?this.m_vertices[parseInt(R+1)]:this.m_vertices[0],aa=N.x-0,Z=N.y-0,d=S.x-0,h=S.y-0,l=aa*h-Z*d,j=0.5*l;H+=j;u+=j*E*(0+N.x+S.x);D+=j*E*(0+N.y+S.y);N=aa;Z=Z;d=d;h=h;O+=l*(E*(0.25*(N*N+d*N+d*d)+(0*N+0*d))+0+(E*(0.25*(Z*Z+h*Z+h*h)+(0*Z+0*h))+0))}k.mass=z*H;u*=1/H;D*=1/H;k.center.Set(u,D);k.I=z*O}};A.prototype.ComputeSubmergedArea=function(k,z,u,D){if(z===undefined)z=0;var H=B.MulTMV(u.R,k),O=z-B.Dot(k,u.position),E=new Vector_a2j_Number,R=0,N=parseInt(-1);z=
parseInt(-1);var S=false;for(k=k=0;k<this.m_vertexCount;++k){E[k]=B.Dot(H,this.m_vertices[k])-O;var aa=E[k]<-Number.MIN_VALUE;if(k>0)if(aa){if(!S){N=k-1;R++}}else if(S){z=k-1;R++}S=aa}switch(R){case 0:if(S){k=new w;this.ComputeMass(k,1);D.SetV(B.MulX(u,k.center));return k.mass}else return 0;case 1:if(N==-1)N=this.m_vertexCount-1;else z=this.m_vertexCount-1}k=parseInt((N+1)%this.m_vertexCount);H=parseInt((z+1)%this.m_vertexCount);O=(0-E[N])/(E[k]-E[N]);E=(0-E[z])/(E[H]-E[z]);N=new V(this.m_vertices[N].x*
(1-O)+this.m_vertices[k].x*O,this.m_vertices[N].y*(1-O)+this.m_vertices[k].y*O);z=new V(this.m_vertices[z].x*(1-E)+this.m_vertices[H].x*E,this.m_vertices[z].y*(1-E)+this.m_vertices[H].y*E);E=0;O=new V;R=this.m_vertices[k];for(k=k;k!=H;){k=(k+1)%this.m_vertexCount;S=k==H?z:this.m_vertices[k];aa=0.5*((R.x-N.x)*(S.y-N.y)-(R.y-N.y)*(S.x-N.x));E+=aa;O.x+=aa*(N.x+R.x+S.x)/3;O.y+=aa*(N.y+R.y+S.y)/3;R=S}O.Multiply(1/E);D.SetV(B.MulX(u,O));return E};A.prototype.GetVertexCount=function(){return this.m_vertexCount};
A.prototype.GetVertices=function(){return this.m_vertices};A.prototype.GetNormals=function(){return this.m_normals};A.prototype.GetSupport=function(k){for(var z=0,u=this.m_vertices[0].x*k.x+this.m_vertices[0].y*k.y,D=1;D<this.m_vertexCount;++D){var H=this.m_vertices[D].x*k.x+this.m_vertices[D].y*k.y;if(H>u){z=D;u=H}}return z};A.prototype.GetSupportVertex=function(k){for(var z=0,u=this.m_vertices[0].x*k.x+this.m_vertices[0].y*k.y,D=1;D<this.m_vertexCount;++D){var H=this.m_vertices[D].x*k.x+this.m_vertices[D].y*
k.y;if(H>u){z=D;u=H}}return this.m_vertices[z]};A.prototype.Validate=function(){return false};A.prototype.b2PolygonShape=function(){this.__super.b2Shape.call(this);this.m_type=U.e_polygonShape;this.m_centroid=new V;this.m_vertices=new Vector;this.m_normals=new Vector};A.prototype.Reserve=function(k){if(k===undefined)k=0;for(var z=parseInt(this.m_vertices.length);z<k;z++){this.m_vertices[z]=new V;this.m_normals[z]=new V}};A.ComputeCentroid=function(k,z){if(z===undefined)z=0;for(var u=new V,D=0,H=1/
3,O=0;O<z;++O){var E=k[O],R=O+1<z?k[parseInt(O+1)]:k[0],N=0.5*((E.x-0)*(R.y-0)-(E.y-0)*(R.x-0));D+=N;u.x+=N*H*(0+E.x+R.x);u.y+=N*H*(0+E.y+R.y)}u.x*=1/D;u.y*=1/D;return u};A.ComputeOBB=function(k,z,u){if(u===undefined)u=0;var D=0,H=new Vector(u+1);for(D=0;D<u;++D)H[D]=z[D];H[u]=H[0];z=Number.MAX_VALUE;for(D=1;D<=u;++D){var O=H[parseInt(D-1)],E=H[D].x-O.x,R=H[D].y-O.y,N=Math.sqrt(E*E+R*R);E/=N;R/=N;for(var S=-R,aa=E,Z=N=Number.MAX_VALUE,d=-Number.MAX_VALUE,h=-Number.MAX_VALUE,l=0;l<u;++l){var j=H[l].x-
O.x,o=H[l].y-O.y,q=E*j+R*o;j=S*j+aa*o;if(q<N)N=q;if(j<Z)Z=j;if(q>d)d=q;if(j>h)h=j}l=(d-N)*(h-Z);if(l<0.95*z){z=l;k.R.col1.x=E;k.R.col1.y=R;k.R.col2.x=S;k.R.col2.y=aa;E=0.5*(N+d);R=0.5*(Z+h);S=k.R;k.center.x=O.x+(S.col1.x*E+S.col2.x*R);k.center.y=O.y+(S.col1.y*E+S.col2.y*R);k.extents.x=0.5*(d-N);k.extents.y=0.5*(h-Z)}}};Box2D.postDefs.push(function(){Box2D.Collision.Shapes.b2PolygonShape.s_mat=new p});U.b2Shape=function(){};U.prototype.Copy=function(){return null};U.prototype.Set=function(k){this.m_radius=
k.m_radius};U.prototype.GetType=function(){return this.m_type};U.prototype.TestPoint=function(){return false};U.prototype.RayCast=function(){return false};U.prototype.ComputeAABB=function(){};U.prototype.ComputeMass=function(){};U.prototype.ComputeSubmergedArea=function(){return 0};U.TestOverlap=function(k,z,u,D){var H=new L;H.proxyA=new W;H.proxyA.Set(k);H.proxyB=new W;H.proxyB.Set(u);H.transformA=z;H.transformB=D;H.useRadii=true;k=new Y;k.count=0;z=new I;M.Distance(z,k,H);return z.distance<10*Number.MIN_VALUE};
U.prototype.b2Shape=function(){this.m_type=U.e_unknownShape;this.m_radius=F.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Collision.Shapes.b2Shape.e_unknownShape=parseInt(-1);Box2D.Collision.Shapes.b2Shape.e_circleShape=0;Box2D.Collision.Shapes.b2Shape.e_polygonShape=1;Box2D.Collision.Shapes.b2Shape.e_edgeShape=2;Box2D.Collision.Shapes.b2Shape.e_shapeTypeCount=3;Box2D.Collision.Shapes.b2Shape.e_hitCollide=1;Box2D.Collision.Shapes.b2Shape.e_missCollide=0;Box2D.Collision.Shapes.b2Shape.e_startsInsideCollide=
parseInt(-1)})})();
(function(){var F=Box2D.Common.b2Color,G=Box2D.Common.b2Settings,K=Box2D.Common.Math.b2Math;F.b2Color=function(){this._b=this._g=this._r=0};F.prototype.b2Color=function(y,w,A){if(y===undefined)y=0;if(w===undefined)w=0;if(A===undefined)A=0;this._r=Box2D.parseUInt(255*K.Clamp(y,0,1));this._g=Box2D.parseUInt(255*K.Clamp(w,0,1));this._b=Box2D.parseUInt(255*K.Clamp(A,0,1))};F.prototype.Set=function(y,w,A){if(y===undefined)y=0;if(w===undefined)w=0;if(A===undefined)A=0;this._r=Box2D.parseUInt(255*K.Clamp(y,
0,1));this._g=Box2D.parseUInt(255*K.Clamp(w,0,1));this._b=Box2D.parseUInt(255*K.Clamp(A,0,1))};Object.defineProperty(F.prototype,"r",{enumerable:false,configurable:true,set:function(y){if(y===undefined)y=0;this._r=Box2D.parseUInt(255*K.Clamp(y,0,1))}});Object.defineProperty(F.prototype,"g",{enumerable:false,configurable:true,set:function(y){if(y===undefined)y=0;this._g=Box2D.parseUInt(255*K.Clamp(y,0,1))}});Object.defineProperty(F.prototype,"b",{enumerable:false,configurable:true,set:function(y){if(y===
undefined)y=0;this._b=Box2D.parseUInt(255*K.Clamp(y,0,1))}});Object.defineProperty(F.prototype,"color",{enumerable:false,configurable:true,get:function(){return this._r<<16|this._g<<8|this._b}});G.b2Settings=function(){};G.b2MixFriction=function(y,w){if(y===undefined)y=0;if(w===undefined)w=0;return Math.sqrt(y*w)};G.b2MixRestitution=function(y,w){if(y===undefined)y=0;if(w===undefined)w=0;return y>w?y:w};G.b2Assert=function(y){if(!y)throw"Assertion Failed";};Box2D.postDefs.push(function(){Box2D.Common.b2Settings.VERSION=
"2.1alpha";Box2D.Common.b2Settings.USHRT_MAX=65535;Box2D.Common.b2Settings.b2_pi=Math.PI;Box2D.Common.b2Settings.b2_maxManifoldPoints=2;Box2D.Common.b2Settings.b2_aabbExtension=0.1;Box2D.Common.b2Settings.b2_aabbMultiplier=2;Box2D.Common.b2Settings.b2_polygonRadius=2*G.b2_linearSlop;Box2D.Common.b2Settings.b2_linearSlop=0.0050;Box2D.Common.b2Settings.b2_angularSlop=2/180*G.b2_pi;Box2D.Common.b2Settings.b2_toiSlop=8*G.b2_linearSlop;Box2D.Common.b2Settings.b2_maxTOIContactsPerIsland=32;Box2D.Common.b2Settings.b2_maxTOIJointsPerIsland=
32;Box2D.Common.b2Settings.b2_velocityThreshold=1;Box2D.Common.b2Settings.b2_maxLinearCorrection=0.2;Box2D.Common.b2Settings.b2_maxAngularCorrection=8/180*G.b2_pi;Box2D.Common.b2Settings.b2_maxTranslation=2;Box2D.Common.b2Settings.b2_maxTranslationSquared=G.b2_maxTranslation*G.b2_maxTranslation;Box2D.Common.b2Settings.b2_maxRotation=0.5*G.b2_pi;Box2D.Common.b2Settings.b2_maxRotationSquared=G.b2_maxRotation*G.b2_maxRotation;Box2D.Common.b2Settings.b2_contactBaumgarte=0.2;Box2D.Common.b2Settings.b2_timeToSleep=
0.5;Box2D.Common.b2Settings.b2_linearSleepTolerance=0.01;Box2D.Common.b2Settings.b2_angularSleepTolerance=2/180*G.b2_pi})})();
(function(){var F=Box2D.Common.Math.b2Mat22,G=Box2D.Common.Math.b2Mat33,K=Box2D.Common.Math.b2Math,y=Box2D.Common.Math.b2Sweep,w=Box2D.Common.Math.b2Transform,A=Box2D.Common.Math.b2Vec2,U=Box2D.Common.Math.b2Vec3;F.b2Mat22=function(){this.col1=new A;this.col2=new A};F.prototype.b2Mat22=function(){this.SetIdentity()};F.FromAngle=function(p){if(p===undefined)p=0;var B=new F;B.Set(p);return B};F.FromVV=function(p,B){var Q=new F;Q.SetVV(p,B);return Q};F.prototype.Set=function(p){if(p===undefined)p=0;
var B=Math.cos(p);p=Math.sin(p);this.col1.x=B;this.col2.x=-p;this.col1.y=p;this.col2.y=B};F.prototype.SetVV=function(p,B){this.col1.SetV(p);this.col2.SetV(B)};F.prototype.Copy=function(){var p=new F;p.SetM(this);return p};F.prototype.SetM=function(p){this.col1.SetV(p.col1);this.col2.SetV(p.col2)};F.prototype.AddM=function(p){this.col1.x+=p.col1.x;this.col1.y+=p.col1.y;this.col2.x+=p.col2.x;this.col2.y+=p.col2.y};F.prototype.SetIdentity=function(){this.col1.x=1;this.col2.x=0;this.col1.y=0;this.col2.y=
1};F.prototype.SetZero=function(){this.col1.x=0;this.col2.x=0;this.col1.y=0;this.col2.y=0};F.prototype.GetAngle=function(){return Math.atan2(this.col1.y,this.col1.x)};F.prototype.GetInverse=function(p){var B=this.col1.x,Q=this.col2.x,V=this.col1.y,M=this.col2.y,L=B*M-Q*V;if(L!=0)L=1/L;p.col1.x=L*M;p.col2.x=-L*Q;p.col1.y=-L*V;p.col2.y=L*B;return p};F.prototype.Solve=function(p,B,Q){if(B===undefined)B=0;if(Q===undefined)Q=0;var V=this.col1.x,M=this.col2.x,L=this.col1.y,I=this.col2.y,W=V*I-M*L;if(W!=
0)W=1/W;p.x=W*(I*B-M*Q);p.y=W*(V*Q-L*B);return p};F.prototype.Abs=function(){this.col1.Abs();this.col2.Abs()};G.b2Mat33=function(){this.col1=new U;this.col2=new U;this.col3=new U};G.prototype.b2Mat33=function(p,B,Q){if(p===undefined)p=null;if(B===undefined)B=null;if(Q===undefined)Q=null;if(!p&&!B&&!Q){this.col1.SetZero();this.col2.SetZero();this.col3.SetZero()}else{this.col1.SetV(p);this.col2.SetV(B);this.col3.SetV(Q)}};G.prototype.SetVVV=function(p,B,Q){this.col1.SetV(p);this.col2.SetV(B);this.col3.SetV(Q)};
G.prototype.Copy=function(){return new G(this.col1,this.col2,this.col3)};G.prototype.SetM=function(p){this.col1.SetV(p.col1);this.col2.SetV(p.col2);this.col3.SetV(p.col3)};G.prototype.AddM=function(p){this.col1.x+=p.col1.x;this.col1.y+=p.col1.y;this.col1.z+=p.col1.z;this.col2.x+=p.col2.x;this.col2.y+=p.col2.y;this.col2.z+=p.col2.z;this.col3.x+=p.col3.x;this.col3.y+=p.col3.y;this.col3.z+=p.col3.z};G.prototype.SetIdentity=function(){this.col1.x=1;this.col2.x=0;this.col3.x=0;this.col1.y=0;this.col2.y=
1;this.col3.y=0;this.col1.z=0;this.col2.z=0;this.col3.z=1};G.prototype.SetZero=function(){this.col1.x=0;this.col2.x=0;this.col3.x=0;this.col1.y=0;this.col2.y=0;this.col3.y=0;this.col1.z=0;this.col2.z=0;this.col3.z=0};G.prototype.Solve22=function(p,B,Q){if(B===undefined)B=0;if(Q===undefined)Q=0;var V=this.col1.x,M=this.col2.x,L=this.col1.y,I=this.col2.y,W=V*I-M*L;if(W!=0)W=1/W;p.x=W*(I*B-M*Q);p.y=W*(V*Q-L*B);return p};G.prototype.Solve33=function(p,B,Q,V){if(B===undefined)B=0;if(Q===undefined)Q=0;
if(V===undefined)V=0;var M=this.col1.x,L=this.col1.y,I=this.col1.z,W=this.col2.x,Y=this.col2.y,k=this.col2.z,z=this.col3.x,u=this.col3.y,D=this.col3.z,H=M*(Y*D-k*u)+L*(k*z-W*D)+I*(W*u-Y*z);if(H!=0)H=1/H;p.x=H*(B*(Y*D-k*u)+Q*(k*z-W*D)+V*(W*u-Y*z));p.y=H*(M*(Q*D-V*u)+L*(V*z-B*D)+I*(B*u-Q*z));p.z=H*(M*(Y*V-k*Q)+L*(k*B-W*V)+I*(W*Q-Y*B));return p};K.b2Math=function(){};K.IsValid=function(p){if(p===undefined)p=0;return isFinite(p)};K.Dot=function(p,B){return p.x*B.x+p.y*B.y};K.CrossVV=function(p,B){return p.x*
B.y-p.y*B.x};K.CrossVF=function(p,B){if(B===undefined)B=0;return new A(B*p.y,-B*p.x)};K.CrossFV=function(p,B){if(p===undefined)p=0;return new A(-p*B.y,p*B.x)};K.MulMV=function(p,B){return new A(p.col1.x*B.x+p.col2.x*B.y,p.col1.y*B.x+p.col2.y*B.y)};K.MulTMV=function(p,B){return new A(K.Dot(B,p.col1),K.Dot(B,p.col2))};K.MulX=function(p,B){var Q=K.MulMV(p.R,B);Q.x+=p.position.x;Q.y+=p.position.y;return Q};K.MulXT=function(p,B){var Q=K.SubtractVV(B,p.position),V=Q.x*p.R.col1.x+Q.y*p.R.col1.y;Q.y=Q.x*
p.R.col2.x+Q.y*p.R.col2.y;Q.x=V;return Q};K.AddVV=function(p,B){return new A(p.x+B.x,p.y+B.y)};K.SubtractVV=function(p,B){return new A(p.x-B.x,p.y-B.y)};K.Distance=function(p,B){var Q=p.x-B.x,V=p.y-B.y;return Math.sqrt(Q*Q+V*V)};K.DistanceSquared=function(p,B){var Q=p.x-B.x,V=p.y-B.y;return Q*Q+V*V};K.MulFV=function(p,B){if(p===undefined)p=0;return new A(p*B.x,p*B.y)};K.AddMM=function(p,B){return F.FromVV(K.AddVV(p.col1,B.col1),K.AddVV(p.col2,B.col2))};K.MulMM=function(p,B){return F.FromVV(K.MulMV(p,
B.col1),K.MulMV(p,B.col2))};K.MulTMM=function(p,B){var Q=new A(K.Dot(p.col1,B.col1),K.Dot(p.col2,B.col1)),V=new A(K.Dot(p.col1,B.col2),K.Dot(p.col2,B.col2));return F.FromVV(Q,V)};K.Abs=function(p){if(p===undefined)p=0;return p>0?p:-p};K.AbsV=function(p){return new A(K.Abs(p.x),K.Abs(p.y))};K.AbsM=function(p){return F.FromVV(K.AbsV(p.col1),K.AbsV(p.col2))};K.Min=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;return p<B?p:B};K.MinV=function(p,B){return new A(K.Min(p.x,B.x),K.Min(p.y,B.y))};
K.Max=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;return p>B?p:B};K.MaxV=function(p,B){return new A(K.Max(p.x,B.x),K.Max(p.y,B.y))};K.Clamp=function(p,B,Q){if(p===undefined)p=0;if(B===undefined)B=0;if(Q===undefined)Q=0;return p<B?B:p>Q?Q:p};K.ClampV=function(p,B,Q){return K.MaxV(B,K.MinV(p,Q))};K.Swap=function(p,B){var Q=p[0];p[0]=B[0];B[0]=Q};K.Random=function(){return Math.random()*2-1};K.RandomRange=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;var Q=Math.random();return Q=
(B-p)*Q+p};K.NextPowerOfTwo=function(p){if(p===undefined)p=0;p|=p>>1&2147483647;p|=p>>2&1073741823;p|=p>>4&268435455;p|=p>>8&16777215;p|=p>>16&65535;return p+1};K.IsPowerOfTwo=function(p){if(p===undefined)p=0;return p>0&&(p&p-1)==0};Box2D.postDefs.push(function(){Box2D.Common.Math.b2Math.b2Vec2_zero=new A(0,0);Box2D.Common.Math.b2Math.b2Mat22_identity=F.FromVV(new A(1,0),new A(0,1));Box2D.Common.Math.b2Math.b2Transform_identity=new w(K.b2Vec2_zero,K.b2Mat22_identity)});y.b2Sweep=function(){this.localCenter=
new A;this.c0=new A;this.c=new A};y.prototype.Set=function(p){this.localCenter.SetV(p.localCenter);this.c0.SetV(p.c0);this.c.SetV(p.c);this.a0=p.a0;this.a=p.a;this.t0=p.t0};y.prototype.Copy=function(){var p=new y;p.localCenter.SetV(this.localCenter);p.c0.SetV(this.c0);p.c.SetV(this.c);p.a0=this.a0;p.a=this.a;p.t0=this.t0;return p};y.prototype.GetTransform=function(p,B){if(B===undefined)B=0;p.position.x=(1-B)*this.c0.x+B*this.c.x;p.position.y=(1-B)*this.c0.y+B*this.c.y;p.R.Set((1-B)*this.a0+B*this.a);
var Q=p.R;p.position.x-=Q.col1.x*this.localCenter.x+Q.col2.x*this.localCenter.y;p.position.y-=Q.col1.y*this.localCenter.x+Q.col2.y*this.localCenter.y};y.prototype.Advance=function(p){if(p===undefined)p=0;if(this.t0<p&&1-this.t0>Number.MIN_VALUE){var B=(p-this.t0)/(1-this.t0);this.c0.x=(1-B)*this.c0.x+B*this.c.x;this.c0.y=(1-B)*this.c0.y+B*this.c.y;this.a0=(1-B)*this.a0+B*this.a;this.t0=p}};w.b2Transform=function(){this.position=new A;this.R=new F};w.prototype.b2Transform=function(p,B){if(p===undefined)p=
null;if(B===undefined)B=null;if(p){this.position.SetV(p);this.R.SetM(B)}};w.prototype.Initialize=function(p,B){this.position.SetV(p);this.R.SetM(B)};w.prototype.SetIdentity=function(){this.position.SetZero();this.R.SetIdentity()};w.prototype.Set=function(p){this.position.SetV(p.position);this.R.SetM(p.R)};w.prototype.GetAngle=function(){return Math.atan2(this.R.col1.y,this.R.col1.x)};A.b2Vec2=function(){};A.prototype.b2Vec2=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;this.x=p;this.y=B};
A.prototype.SetZero=function(){this.y=this.x=0};A.prototype.Set=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;this.x=p;this.y=B};A.prototype.SetV=function(p){this.x=p.x;this.y=p.y};A.prototype.GetNegative=function(){return new A(-this.x,-this.y)};A.prototype.NegativeSelf=function(){this.x=-this.x;this.y=-this.y};A.Make=function(p,B){if(p===undefined)p=0;if(B===undefined)B=0;return new A(p,B)};A.prototype.Copy=function(){return new A(this.x,this.y)};A.prototype.Add=function(p){this.x+=p.x;
this.y+=p.y};A.prototype.Subtract=function(p){this.x-=p.x;this.y-=p.y};A.prototype.Multiply=function(p){if(p===undefined)p=0;this.x*=p;this.y*=p};A.prototype.MulM=function(p){var B=this.x;this.x=p.col1.x*B+p.col2.x*this.y;this.y=p.col1.y*B+p.col2.y*this.y};A.prototype.MulTM=function(p){var B=K.Dot(this,p.col1);this.y=K.Dot(this,p.col2);this.x=B};A.prototype.CrossVF=function(p){if(p===undefined)p=0;var B=this.x;this.x=p*this.y;this.y=-p*B};A.prototype.CrossFV=function(p){if(p===undefined)p=0;var B=
this.x;this.x=-p*this.y;this.y=p*B};A.prototype.MinV=function(p){this.x=this.x<p.x?this.x:p.x;this.y=this.y<p.y?this.y:p.y};A.prototype.MaxV=function(p){this.x=this.x>p.x?this.x:p.x;this.y=this.y>p.y?this.y:p.y};A.prototype.Abs=function(){if(this.x<0)this.x=-this.x;if(this.y<0)this.y=-this.y};A.prototype.Length=function(){return Math.sqrt(this.x*this.x+this.y*this.y)};A.prototype.LengthSquared=function(){return this.x*this.x+this.y*this.y};A.prototype.Normalize=function(){var p=Math.sqrt(this.x*this.x+
this.y*this.y);if(p<Number.MIN_VALUE)return 0;var B=1/p;this.x*=B;this.y*=B;return p};A.prototype.IsValid=function(){return K.IsValid(this.x)&&K.IsValid(this.y)};U.b2Vec3=function(){};U.prototype.b2Vec3=function(p,B,Q){if(p===undefined)p=0;if(B===undefined)B=0;if(Q===undefined)Q=0;this.x=p;this.y=B;this.z=Q};U.prototype.SetZero=function(){this.x=this.y=this.z=0};U.prototype.Set=function(p,B,Q){if(p===undefined)p=0;if(B===undefined)B=0;if(Q===undefined)Q=0;this.x=p;this.y=B;this.z=Q};U.prototype.SetV=
function(p){this.x=p.x;this.y=p.y;this.z=p.z};U.prototype.GetNegative=function(){return new U(-this.x,-this.y,-this.z)};U.prototype.NegativeSelf=function(){this.x=-this.x;this.y=-this.y;this.z=-this.z};U.prototype.Copy=function(){return new U(this.x,this.y,this.z)};U.prototype.Add=function(p){this.x+=p.x;this.y+=p.y;this.z+=p.z};U.prototype.Subtract=function(p){this.x-=p.x;this.y-=p.y;this.z-=p.z};U.prototype.Multiply=function(p){if(p===undefined)p=0;this.x*=p;this.y*=p;this.z*=p}})();
(function(){var F=Box2D.Common.Math.b2Math,G=Box2D.Common.Math.b2Sweep,K=Box2D.Common.Math.b2Transform,y=Box2D.Common.Math.b2Vec2,w=Box2D.Common.b2Color,A=Box2D.Common.b2Settings,U=Box2D.Collision.b2AABB,p=Box2D.Collision.b2ContactPoint,B=Box2D.Collision.b2DynamicTreeBroadPhase,Q=Box2D.Collision.b2RayCastInput,V=Box2D.Collision.b2RayCastOutput,M=Box2D.Collision.Shapes.b2CircleShape,L=Box2D.Collision.Shapes.b2EdgeShape,I=Box2D.Collision.Shapes.b2MassData,W=Box2D.Collision.Shapes.b2PolygonShape,Y=Box2D.Collision.Shapes.b2Shape,
k=Box2D.Dynamics.b2Body,z=Box2D.Dynamics.b2BodyDef,u=Box2D.Dynamics.b2ContactFilter,D=Box2D.Dynamics.b2ContactImpulse,H=Box2D.Dynamics.b2ContactListener,O=Box2D.Dynamics.b2ContactManager,E=Box2D.Dynamics.b2DebugDraw,R=Box2D.Dynamics.b2DestructionListener,N=Box2D.Dynamics.b2FilterData,S=Box2D.Dynamics.b2Fixture,aa=Box2D.Dynamics.b2FixtureDef,Z=Box2D.Dynamics.b2Island,d=Box2D.Dynamics.b2TimeStep,h=Box2D.Dynamics.b2World,l=Box2D.Dynamics.Contacts.b2Contact,j=Box2D.Dynamics.Contacts.b2ContactFactory,
o=Box2D.Dynamics.Contacts.b2ContactSolver,q=Box2D.Dynamics.Joints.b2Joint,n=Box2D.Dynamics.Joints.b2PulleyJoint;k.b2Body=function(){this.m_xf=new K;this.m_sweep=new G;this.m_linearVelocity=new y;this.m_force=new y};k.prototype.connectEdges=function(a,c,g){if(g===undefined)g=0;var b=Math.atan2(c.GetDirectionVector().y,c.GetDirectionVector().x);g=F.MulFV(Math.tan((b-g)*0.5),c.GetDirectionVector());g=F.SubtractVV(g,c.GetNormalVector());g=F.MulFV(A.b2_toiSlop,g);g=F.AddVV(g,c.GetVertex1());var e=F.AddVV(a.GetDirectionVector(),
c.GetDirectionVector());e.Normalize();var f=F.Dot(a.GetDirectionVector(),c.GetNormalVector())>0;a.SetNextEdge(c,g,e,f);c.SetPrevEdge(a,g,e,f);return b};k.prototype.CreateFixture=function(a){if(this.m_world.IsLocked()==true)return null;var c=new S;c.Create(this,this.m_xf,a);this.m_flags&k.e_activeFlag&&c.CreateProxy(this.m_world.m_contactManager.m_broadPhase,this.m_xf);c.m_next=this.m_fixtureList;this.m_fixtureList=c;++this.m_fixtureCount;c.m_body=this;c.m_density>0&&this.ResetMassData();this.m_world.m_flags|=
h.e_newFixture;return c};k.prototype.CreateFixture2=function(a,c){if(c===undefined)c=0;var g=new aa;g.shape=a;g.density=c;return this.CreateFixture(g)};k.prototype.DestroyFixture=function(a){if(this.m_world.IsLocked()!=true){for(var c=this.m_fixtureList,g=null;c!=null;){if(c==a){if(g)g.m_next=a.m_next;else this.m_fixtureList=a.m_next;break}g=c;c=c.m_next}for(c=this.m_contactList;c;){g=c.contact;c=c.next;var b=g.GetFixtureA(),e=g.GetFixtureB();if(a==b||a==e)this.m_world.m_contactManager.Destroy(g)}this.m_flags&
k.e_activeFlag&&a.DestroyProxy(this.m_world.m_contactManager.m_broadPhase);a.Destroy();a.m_body=null;a.m_next=null;--this.m_fixtureCount;this.ResetMassData()}};k.prototype.SetPositionAndAngle=function(a,c){if(c===undefined)c=0;var g;if(this.m_world.IsLocked()!=true){this.m_xf.R.Set(c);this.m_xf.position.SetV(a);g=this.m_xf.R;var b=this.m_sweep.localCenter;this.m_sweep.c.x=g.col1.x*b.x+g.col2.x*b.y;this.m_sweep.c.y=g.col1.y*b.x+g.col2.y*b.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=
this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_sweep.a0=this.m_sweep.a=c;b=this.m_world.m_contactManager.m_broadPhase;for(g=this.m_fixtureList;g;g=g.m_next)g.Synchronize(b,this.m_xf,this.m_xf);this.m_world.m_contactManager.FindNewContacts()}};k.prototype.SetTransform=function(a){this.SetPositionAndAngle(a.position,a.GetAngle())};k.prototype.GetTransform=function(){return this.m_xf};k.prototype.GetPosition=function(){return this.m_xf.position};k.prototype.SetPosition=function(a){this.SetPositionAndAngle(a,
this.GetAngle())};k.prototype.GetAngle=function(){return this.m_sweep.a};k.prototype.SetAngle=function(a){if(a===undefined)a=0;this.SetPositionAndAngle(this.GetPosition(),a)};k.prototype.GetWorldCenter=function(){return this.m_sweep.c};k.prototype.GetLocalCenter=function(){return this.m_sweep.localCenter};k.prototype.SetLinearVelocity=function(a){this.m_type!=k.b2_staticBody&&this.m_linearVelocity.SetV(a)};k.prototype.GetLinearVelocity=function(){return this.m_linearVelocity};k.prototype.SetAngularVelocity=
function(a){if(a===undefined)a=0;if(this.m_type!=k.b2_staticBody)this.m_angularVelocity=a};k.prototype.GetAngularVelocity=function(){return this.m_angularVelocity};k.prototype.GetDefinition=function(){var a=new z;a.type=this.GetType();a.allowSleep=(this.m_flags&k.e_allowSleepFlag)==k.e_allowSleepFlag;a.angle=this.GetAngle();a.angularDamping=this.m_angularDamping;a.angularVelocity=this.m_angularVelocity;a.fixedRotation=(this.m_flags&k.e_fixedRotationFlag)==k.e_fixedRotationFlag;a.bullet=(this.m_flags&
k.e_bulletFlag)==k.e_bulletFlag;a.awake=(this.m_flags&k.e_awakeFlag)==k.e_awakeFlag;a.linearDamping=this.m_linearDamping;a.linearVelocity.SetV(this.GetLinearVelocity());a.position=this.GetPosition();a.userData=this.GetUserData();return a};k.prototype.ApplyForce=function(a,c){if(this.m_type==k.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_force.x+=a.x;this.m_force.y+=a.y;this.m_torque+=(c.x-this.m_sweep.c.x)*a.y-(c.y-this.m_sweep.c.y)*a.x}};k.prototype.ApplyTorque=function(a){if(a===
undefined)a=0;if(this.m_type==k.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_torque+=a}};k.prototype.ApplyImpulse=function(a,c){if(this.m_type==k.b2_dynamicBody){this.IsAwake()==false&&this.SetAwake(true);this.m_linearVelocity.x+=this.m_invMass*a.x;this.m_linearVelocity.y+=this.m_invMass*a.y;this.m_angularVelocity+=this.m_invI*((c.x-this.m_sweep.c.x)*a.y-(c.y-this.m_sweep.c.y)*a.x)}};k.prototype.Split=function(a){for(var c=this.GetLinearVelocity().Copy(),g=this.GetAngularVelocity(),
b=this.GetWorldCenter(),e=this.m_world.CreateBody(this.GetDefinition()),f,m=this.m_fixtureList;m;)if(a(m)){var r=m.m_next;if(f)f.m_next=r;else this.m_fixtureList=r;this.m_fixtureCount--;m.m_next=e.m_fixtureList;e.m_fixtureList=m;e.m_fixtureCount++;m.m_body=e;m=r}else{f=m;m=m.m_next}this.ResetMassData();e.ResetMassData();f=this.GetWorldCenter();a=e.GetWorldCenter();f=F.AddVV(c,F.CrossFV(g,F.SubtractVV(f,b)));c=F.AddVV(c,F.CrossFV(g,F.SubtractVV(a,b)));this.SetLinearVelocity(f);e.SetLinearVelocity(c);
this.SetAngularVelocity(g);e.SetAngularVelocity(g);this.SynchronizeFixtures();e.SynchronizeFixtures();return e};k.prototype.Merge=function(a){var c;for(c=a.m_fixtureList;c;){var g=c.m_next;a.m_fixtureCount--;c.m_next=this.m_fixtureList;this.m_fixtureList=c;this.m_fixtureCount++;c.m_body=e;c=g}b.m_fixtureCount=0;var b=this,e=a;b.GetWorldCenter();e.GetWorldCenter();b.GetLinearVelocity().Copy();e.GetLinearVelocity().Copy();b.GetAngularVelocity();e.GetAngularVelocity();b.ResetMassData();this.SynchronizeFixtures()};
k.prototype.GetMass=function(){return this.m_mass};k.prototype.GetInertia=function(){return this.m_I};k.prototype.GetMassData=function(a){a.mass=this.m_mass;a.I=this.m_I;a.center.SetV(this.m_sweep.localCenter)};k.prototype.SetMassData=function(a){A.b2Assert(this.m_world.IsLocked()==false);if(this.m_world.IsLocked()!=true)if(this.m_type==k.b2_dynamicBody){this.m_invI=this.m_I=this.m_invMass=0;this.m_mass=a.mass;if(this.m_mass<=0)this.m_mass=1;this.m_invMass=1/this.m_mass;if(a.I>0&&(this.m_flags&k.e_fixedRotationFlag)==
0){this.m_I=a.I-this.m_mass*(a.center.x*a.center.x+a.center.y*a.center.y);this.m_invI=1/this.m_I}var c=this.m_sweep.c.Copy();this.m_sweep.localCenter.SetV(a.center);this.m_sweep.c0.SetV(F.MulX(this.m_xf,this.m_sweep.localCenter));this.m_sweep.c.SetV(this.m_sweep.c0);this.m_linearVelocity.x+=this.m_angularVelocity*-(this.m_sweep.c.y-c.y);this.m_linearVelocity.y+=this.m_angularVelocity*+(this.m_sweep.c.x-c.x)}};k.prototype.ResetMassData=function(){this.m_invI=this.m_I=this.m_invMass=this.m_mass=0;this.m_sweep.localCenter.SetZero();
if(!(this.m_type==k.b2_staticBody||this.m_type==k.b2_kinematicBody)){for(var a=y.Make(0,0),c=this.m_fixtureList;c;c=c.m_next)if(c.m_density!=0){var g=c.GetMassData();this.m_mass+=g.mass;a.x+=g.center.x*g.mass;a.y+=g.center.y*g.mass;this.m_I+=g.I}if(this.m_mass>0){this.m_invMass=1/this.m_mass;a.x*=this.m_invMass;a.y*=this.m_invMass}else this.m_invMass=this.m_mass=1;if(this.m_I>0&&(this.m_flags&k.e_fixedRotationFlag)==0){this.m_I-=this.m_mass*(a.x*a.x+a.y*a.y);this.m_I*=this.m_inertiaScale;A.b2Assert(this.m_I>
0);this.m_invI=1/this.m_I}else this.m_invI=this.m_I=0;c=this.m_sweep.c.Copy();this.m_sweep.localCenter.SetV(a);this.m_sweep.c0.SetV(F.MulX(this.m_xf,this.m_sweep.localCenter));this.m_sweep.c.SetV(this.m_sweep.c0);this.m_linearVelocity.x+=this.m_angularVelocity*-(this.m_sweep.c.y-c.y);this.m_linearVelocity.y+=this.m_angularVelocity*+(this.m_sweep.c.x-c.x)}};k.prototype.GetWorldPoint=function(a){var c=this.m_xf.R;a=new y(c.col1.x*a.x+c.col2.x*a.y,c.col1.y*a.x+c.col2.y*a.y);a.x+=this.m_xf.position.x;
a.y+=this.m_xf.position.y;return a};k.prototype.GetWorldVector=function(a){return F.MulMV(this.m_xf.R,a)};k.prototype.GetLocalPoint=function(a){return F.MulXT(this.m_xf,a)};k.prototype.GetLocalVector=function(a){return F.MulTMV(this.m_xf.R,a)};k.prototype.GetLinearVelocityFromWorldPoint=function(a){return new y(this.m_linearVelocity.x-this.m_angularVelocity*(a.y-this.m_sweep.c.y),this.m_linearVelocity.y+this.m_angularVelocity*(a.x-this.m_sweep.c.x))};k.prototype.GetLinearVelocityFromLocalPoint=function(a){var c=
this.m_xf.R;a=new y(c.col1.x*a.x+c.col2.x*a.y,c.col1.y*a.x+c.col2.y*a.y);a.x+=this.m_xf.position.x;a.y+=this.m_xf.position.y;return new y(this.m_linearVelocity.x-this.m_angularVelocity*(a.y-this.m_sweep.c.y),this.m_linearVelocity.y+this.m_angularVelocity*(a.x-this.m_sweep.c.x))};k.prototype.GetLinearDamping=function(){return this.m_linearDamping};k.prototype.SetLinearDamping=function(a){if(a===undefined)a=0;this.m_linearDamping=a};k.prototype.GetAngularDamping=function(){return this.m_angularDamping};
k.prototype.SetAngularDamping=function(a){if(a===undefined)a=0;this.m_angularDamping=a};k.prototype.SetType=function(a){if(a===undefined)a=0;if(this.m_type!=a){this.m_type=a;this.ResetMassData();if(this.m_type==k.b2_staticBody){this.m_linearVelocity.SetZero();this.m_angularVelocity=0}this.SetAwake(true);this.m_force.SetZero();this.m_torque=0;for(a=this.m_contactList;a;a=a.next)a.contact.FlagForFiltering()}};k.prototype.GetType=function(){return this.m_type};k.prototype.SetBullet=function(a){if(a)this.m_flags|=
k.e_bulletFlag;else this.m_flags&=~k.e_bulletFlag};k.prototype.IsBullet=function(){return(this.m_flags&k.e_bulletFlag)==k.e_bulletFlag};k.prototype.SetSleepingAllowed=function(a){if(a)this.m_flags|=k.e_allowSleepFlag;else{this.m_flags&=~k.e_allowSleepFlag;this.SetAwake(true)}};k.prototype.SetAwake=function(a){if(a){this.m_flags|=k.e_awakeFlag;this.m_sleepTime=0}else{this.m_flags&=~k.e_awakeFlag;this.m_sleepTime=0;this.m_linearVelocity.SetZero();this.m_angularVelocity=0;this.m_force.SetZero();this.m_torque=
0}};k.prototype.IsAwake=function(){return(this.m_flags&k.e_awakeFlag)==k.e_awakeFlag};k.prototype.SetFixedRotation=function(a){if(a)this.m_flags|=k.e_fixedRotationFlag;else this.m_flags&=~k.e_fixedRotationFlag;this.ResetMassData()};k.prototype.IsFixedRotation=function(){return(this.m_flags&k.e_fixedRotationFlag)==k.e_fixedRotationFlag};k.prototype.SetActive=function(a){if(a!=this.IsActive()){var c;if(a){this.m_flags|=k.e_activeFlag;a=this.m_world.m_contactManager.m_broadPhase;for(c=this.m_fixtureList;c;c=
c.m_next)c.CreateProxy(a,this.m_xf)}else{this.m_flags&=~k.e_activeFlag;a=this.m_world.m_contactManager.m_broadPhase;for(c=this.m_fixtureList;c;c=c.m_next)c.DestroyProxy(a);for(a=this.m_contactList;a;){c=a;a=a.next;this.m_world.m_contactManager.Destroy(c.contact)}this.m_contactList=null}}};k.prototype.IsActive=function(){return(this.m_flags&k.e_activeFlag)==k.e_activeFlag};k.prototype.IsSleepingAllowed=function(){return(this.m_flags&k.e_allowSleepFlag)==k.e_allowSleepFlag};k.prototype.GetFixtureList=
function(){return this.m_fixtureList};k.prototype.GetJointList=function(){return this.m_jointList};k.prototype.GetControllerList=function(){return this.m_controllerList};k.prototype.GetContactList=function(){return this.m_contactList};k.prototype.GetNext=function(){return this.m_next};k.prototype.GetUserData=function(){return this.m_userData};k.prototype.SetUserData=function(a){this.m_userData=a};k.prototype.GetWorld=function(){return this.m_world};k.prototype.b2Body=function(a,c){this.m_flags=0;
if(a.bullet)this.m_flags|=k.e_bulletFlag;if(a.fixedRotation)this.m_flags|=k.e_fixedRotationFlag;if(a.allowSleep)this.m_flags|=k.e_allowSleepFlag;if(a.awake)this.m_flags|=k.e_awakeFlag;if(a.active)this.m_flags|=k.e_activeFlag;this.m_world=c;this.m_xf.position.SetV(a.position);this.m_xf.R.Set(a.angle);this.m_sweep.localCenter.SetZero();this.m_sweep.t0=1;this.m_sweep.a0=this.m_sweep.a=a.angle;var g=this.m_xf.R,b=this.m_sweep.localCenter;this.m_sweep.c.x=g.col1.x*b.x+g.col2.x*b.y;this.m_sweep.c.y=g.col1.y*
b.x+g.col2.y*b.y;this.m_sweep.c.x+=this.m_xf.position.x;this.m_sweep.c.y+=this.m_xf.position.y;this.m_sweep.c0.SetV(this.m_sweep.c);this.m_contactList=this.m_controllerList=this.m_jointList=null;this.m_controllerCount=0;this.m_next=this.m_prev=null;this.m_linearVelocity.SetV(a.linearVelocity);this.m_angularVelocity=a.angularVelocity;this.m_linearDamping=a.linearDamping;this.m_angularDamping=a.angularDamping;this.m_force.Set(0,0);this.m_sleepTime=this.m_torque=0;this.m_type=a.type;if(this.m_type==
k.b2_dynamicBody)this.m_invMass=this.m_mass=1;else this.m_invMass=this.m_mass=0;this.m_invI=this.m_I=0;this.m_inertiaScale=a.inertiaScale;this.m_userData=a.userData;this.m_fixtureList=null;this.m_fixtureCount=0};k.prototype.SynchronizeFixtures=function(){var a=k.s_xf1;a.R.Set(this.m_sweep.a0);var c=a.R,g=this.m_sweep.localCenter;a.position.x=this.m_sweep.c0.x-(c.col1.x*g.x+c.col2.x*g.y);a.position.y=this.m_sweep.c0.y-(c.col1.y*g.x+c.col2.y*g.y);g=this.m_world.m_contactManager.m_broadPhase;for(c=this.m_fixtureList;c;c=
c.m_next)c.Synchronize(g,a,this.m_xf)};k.prototype.SynchronizeTransform=function(){this.m_xf.R.Set(this.m_sweep.a);var a=this.m_xf.R,c=this.m_sweep.localCenter;this.m_xf.position.x=this.m_sweep.c.x-(a.col1.x*c.x+a.col2.x*c.y);this.m_xf.position.y=this.m_sweep.c.y-(a.col1.y*c.x+a.col2.y*c.y)};k.prototype.ShouldCollide=function(a){if(this.m_type!=k.b2_dynamicBody&&a.m_type!=k.b2_dynamicBody)return false;for(var c=this.m_jointList;c;c=c.next)if(c.other==a)if(c.joint.m_collideConnected==false)return false;
return true};k.prototype.Advance=function(a){if(a===undefined)a=0;this.m_sweep.Advance(a);this.m_sweep.c.SetV(this.m_sweep.c0);this.m_sweep.a=this.m_sweep.a0;this.SynchronizeTransform()};Box2D.postDefs.push(function(){Box2D.Dynamics.b2Body.s_xf1=new K;Box2D.Dynamics.b2Body.e_islandFlag=1;Box2D.Dynamics.b2Body.e_awakeFlag=2;Box2D.Dynamics.b2Body.e_allowSleepFlag=4;Box2D.Dynamics.b2Body.e_bulletFlag=8;Box2D.Dynamics.b2Body.e_fixedRotationFlag=16;Box2D.Dynamics.b2Body.e_activeFlag=32;Box2D.Dynamics.b2Body.b2_staticBody=
0;Box2D.Dynamics.b2Body.b2_kinematicBody=1;Box2D.Dynamics.b2Body.b2_dynamicBody=2});z.b2BodyDef=function(){this.position=new y;this.linearVelocity=new y};z.prototype.b2BodyDef=function(){this.userData=null;this.position.Set(0,0);this.angle=0;this.linearVelocity.Set(0,0);this.angularDamping=this.linearDamping=this.angularVelocity=0;this.awake=this.allowSleep=true;this.bullet=this.fixedRotation=false;this.type=k.b2_staticBody;this.active=true;this.inertiaScale=1};u.b2ContactFilter=function(){};u.prototype.ShouldCollide=
function(a,c){var g=a.GetFilterData(),b=c.GetFilterData();if(g.groupIndex==b.groupIndex&&g.groupIndex!=0)return g.groupIndex>0;return(g.maskBits&b.categoryBits)!=0&&(g.categoryBits&b.maskBits)!=0};u.prototype.RayCollide=function(a,c){if(!a)return true;return this.ShouldCollide(a instanceof S?a:null,c)};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactFilter.b2_defaultFilter=new u});D.b2ContactImpulse=function(){this.normalImpulses=new Vector_a2j_Number(A.b2_maxManifoldPoints);this.tangentImpulses=
new Vector_a2j_Number(A.b2_maxManifoldPoints)};H.b2ContactListener=function(){};H.prototype.BeginContact=function(){};H.prototype.EndContact=function(){};H.prototype.PreSolve=function(){};H.prototype.PostSolve=function(){};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactListener.b2_defaultListener=new H});O.b2ContactManager=function(){};O.prototype.b2ContactManager=function(){this.m_world=null;this.m_contactCount=0;this.m_contactFilter=u.b2_defaultFilter;this.m_contactListener=H.b2_defaultListener;
this.m_contactFactory=new j(this.m_allocator);this.m_broadPhase=new B};O.prototype.AddPair=function(a,c){var g=a instanceof S?a:null,b=c instanceof S?c:null,e=g.GetBody(),f=b.GetBody();if(e!=f){for(var m=f.GetContactList();m;){if(m.other==e){var r=m.contact.GetFixtureA(),s=m.contact.GetFixtureB();if(r==g&&s==b)return;if(r==b&&s==g)return}m=m.next}if(f.ShouldCollide(e)!=false)if(this.m_contactFilter.ShouldCollide(g,b)!=false){m=this.m_contactFactory.Create(g,b);g=m.GetFixtureA();b=m.GetFixtureB();
e=g.m_body;f=b.m_body;m.m_prev=null;m.m_next=this.m_world.m_contactList;if(this.m_world.m_contactList!=null)this.m_world.m_contactList.m_prev=m;this.m_world.m_contactList=m;m.m_nodeA.contact=m;m.m_nodeA.other=f;m.m_nodeA.prev=null;m.m_nodeA.next=e.m_contactList;if(e.m_contactList!=null)e.m_contactList.prev=m.m_nodeA;e.m_contactList=m.m_nodeA;m.m_nodeB.contact=m;m.m_nodeB.other=e;m.m_nodeB.prev=null;m.m_nodeB.next=f.m_contactList;if(f.m_contactList!=null)f.m_contactList.prev=m.m_nodeB;f.m_contactList=
m.m_nodeB;++this.m_world.m_contactCount}}};O.prototype.FindNewContacts=function(){this.m_broadPhase.UpdatePairs(Box2D.generateCallback(this,this.AddPair))};O.prototype.Destroy=function(a){var c=a.GetFixtureA(),g=a.GetFixtureB();c=c.GetBody();g=g.GetBody();a.IsTouching()&&this.m_contactListener.EndContact(a);if(a.m_prev)a.m_prev.m_next=a.m_next;if(a.m_next)a.m_next.m_prev=a.m_prev;if(a==this.m_world.m_contactList)this.m_world.m_contactList=a.m_next;if(a.m_nodeA.prev)a.m_nodeA.prev.next=a.m_nodeA.next;
if(a.m_nodeA.next)a.m_nodeA.next.prev=a.m_nodeA.prev;if(a.m_nodeA==c.m_contactList)c.m_contactList=a.m_nodeA.next;if(a.m_nodeB.prev)a.m_nodeB.prev.next=a.m_nodeB.next;if(a.m_nodeB.next)a.m_nodeB.next.prev=a.m_nodeB.prev;if(a.m_nodeB==g.m_contactList)g.m_contactList=a.m_nodeB.next;this.m_contactFactory.Destroy(a);--this.m_contactCount};O.prototype.Collide=function(){for(var a=this.m_world.m_contactList;a;){var c=a.GetFixtureA(),g=a.GetFixtureB(),b=c.GetBody(),e=g.GetBody();if(b.IsAwake()==false&&e.IsAwake()==
false)a=a.GetNext();else{if(a.m_flags&l.e_filterFlag){if(e.ShouldCollide(b)==false){c=a;a=c.GetNext();this.Destroy(c);continue}if(this.m_contactFilter.ShouldCollide(c,g)==false){c=a;a=c.GetNext();this.Destroy(c);continue}a.m_flags&=~l.e_filterFlag}if(this.m_broadPhase.TestOverlap(c.m_proxy,g.m_proxy)==false){c=a;a=c.GetNext();this.Destroy(c)}else{a.Update(this.m_contactListener);a=a.GetNext()}}}};Box2D.postDefs.push(function(){Box2D.Dynamics.b2ContactManager.s_evalCP=new p});E.b2DebugDraw=function(){};
E.prototype.b2DebugDraw=function(){};E.prototype.SetFlags=function(){};E.prototype.GetFlags=function(){};E.prototype.AppendFlags=function(){};E.prototype.ClearFlags=function(){};E.prototype.SetSprite=function(){};E.prototype.GetSprite=function(){};E.prototype.SetDrawScale=function(){};E.prototype.GetDrawScale=function(){};E.prototype.SetLineThickness=function(){};E.prototype.GetLineThickness=function(){};E.prototype.SetAlpha=function(){};E.prototype.GetAlpha=function(){};E.prototype.SetFillAlpha=
function(){};E.prototype.GetFillAlpha=function(){};E.prototype.SetXFormScale=function(){};E.prototype.GetXFormScale=function(){};E.prototype.DrawPolygon=function(){};E.prototype.DrawSolidPolygon=function(){};E.prototype.DrawCircle=function(){};E.prototype.DrawSolidCircle=function(){};E.prototype.DrawSegment=function(){};E.prototype.DrawTransform=function(){};Box2D.postDefs.push(function(){Box2D.Dynamics.b2DebugDraw.e_shapeBit=1;Box2D.Dynamics.b2DebugDraw.e_jointBit=2;Box2D.Dynamics.b2DebugDraw.e_aabbBit=
4;Box2D.Dynamics.b2DebugDraw.e_pairBit=8;Box2D.Dynamics.b2DebugDraw.e_centerOfMassBit=16;Box2D.Dynamics.b2DebugDraw.e_controllerBit=32});R.b2DestructionListener=function(){};R.prototype.SayGoodbyeJoint=function(){};R.prototype.SayGoodbyeFixture=function(){};N.b2FilterData=function(){this.categoryBits=1;this.maskBits=65535;this.groupIndex=0};N.prototype.Copy=function(){var a=new N;a.categoryBits=this.categoryBits;a.maskBits=this.maskBits;a.groupIndex=this.groupIndex;return a};S.b2Fixture=function(){this.m_filter=
new N};S.prototype.GetType=function(){return this.m_shape.GetType()};S.prototype.GetShape=function(){return this.m_shape};S.prototype.SetSensor=function(a){if(this.m_isSensor!=a){this.m_isSensor=a;if(this.m_body!=null)for(a=this.m_body.GetContactList();a;){var c=a.contact,g=c.GetFixtureA(),b=c.GetFixtureB();if(g==this||b==this)c.SetSensor(g.IsSensor()||b.IsSensor());a=a.next}}};S.prototype.IsSensor=function(){return this.m_isSensor};S.prototype.SetFilterData=function(a){this.m_filter=a.Copy();if(!this.m_body)for(a=
this.m_body.GetContactList();a;){var c=a.contact,g=c.GetFixtureA(),b=c.GetFixtureB();if(g==this||b==this)c.FlagForFiltering();a=a.next}};S.prototype.GetFilterData=function(){return this.m_filter.Copy()};S.prototype.GetBody=function(){return this.m_body};S.prototype.GetNext=function(){return this.m_next};S.prototype.GetUserData=function(){return this.m_userData};S.prototype.SetUserData=function(a){this.m_userData=a};S.prototype.TestPoint=function(a){return this.m_shape.TestPoint(this.m_body.GetTransform(),
a)};S.prototype.RayCast=function(a,c){return this.m_shape.RayCast(a,c,this.m_body.GetTransform())};S.prototype.GetMassData=function(a){if(a===undefined)a=null;if(a==null)a=new I;this.m_shape.ComputeMass(a,this.m_density);return a};S.prototype.SetDensity=function(a){if(a===undefined)a=0;this.m_density=a};S.prototype.GetDensity=function(){return this.m_density};S.prototype.GetFriction=function(){return this.m_friction};S.prototype.SetFriction=function(a){if(a===undefined)a=0;this.m_friction=a};S.prototype.GetRestitution=
function(){return this.m_restitution};S.prototype.SetRestitution=function(a){if(a===undefined)a=0;this.m_restitution=a};S.prototype.GetAABB=function(){return this.m_aabb};S.prototype.b2Fixture=function(){this.m_aabb=new U;this.m_shape=this.m_next=this.m_body=this.m_userData=null;this.m_restitution=this.m_friction=this.m_density=0};S.prototype.Create=function(a,c,g){this.m_userData=g.userData;this.m_friction=g.friction;this.m_restitution=g.restitution;this.m_body=a;this.m_next=null;this.m_filter=g.filter.Copy();
this.m_isSensor=g.isSensor;this.m_shape=g.shape.Copy();this.m_density=g.density};S.prototype.Destroy=function(){this.m_shape=null};S.prototype.CreateProxy=function(a,c){this.m_shape.ComputeAABB(this.m_aabb,c);this.m_proxy=a.CreateProxy(this.m_aabb,this)};S.prototype.DestroyProxy=function(a){if(this.m_proxy!=null){a.DestroyProxy(this.m_proxy);this.m_proxy=null}};S.prototype.Synchronize=function(a,c,g){if(this.m_proxy){var b=new U,e=new U;this.m_shape.ComputeAABB(b,c);this.m_shape.ComputeAABB(e,g);
this.m_aabb.Combine(b,e);c=F.SubtractVV(g.position,c.position);a.MoveProxy(this.m_proxy,this.m_aabb,c)}};aa.b2FixtureDef=function(){this.filter=new N};aa.prototype.b2FixtureDef=function(){this.userData=this.shape=null;this.friction=0.2;this.density=this.restitution=0;this.filter.categoryBits=1;this.filter.maskBits=65535;this.filter.groupIndex=0;this.isSensor=false};Z.b2Island=function(){};Z.prototype.b2Island=function(){this.m_bodies=new Vector;this.m_contacts=new Vector;this.m_joints=new Vector};
Z.prototype.Initialize=function(a,c,g,b,e,f){if(a===undefined)a=0;if(c===undefined)c=0;if(g===undefined)g=0;var m=0;this.m_bodyCapacity=a;this.m_contactCapacity=c;this.m_jointCapacity=g;this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;this.m_allocator=b;this.m_listener=e;this.m_contactSolver=f;for(m=this.m_bodies.length;m<a;m++)this.m_bodies[m]=null;for(m=this.m_contacts.length;m<c;m++)this.m_contacts[m]=null;for(m=this.m_joints.length;m<g;m++)this.m_joints[m]=null};Z.prototype.Clear=function(){this.m_jointCount=
this.m_contactCount=this.m_bodyCount=0};Z.prototype.Solve=function(a,c,g){var b=0,e=0,f;for(b=0;b<this.m_bodyCount;++b){e=this.m_bodies[b];if(e.GetType()==k.b2_dynamicBody){e.m_linearVelocity.x+=a.dt*(c.x+e.m_invMass*e.m_force.x);e.m_linearVelocity.y+=a.dt*(c.y+e.m_invMass*e.m_force.y);e.m_angularVelocity+=a.dt*e.m_invI*e.m_torque;e.m_linearVelocity.Multiply(F.Clamp(1-a.dt*e.m_linearDamping,0,1));e.m_angularVelocity*=F.Clamp(1-a.dt*e.m_angularDamping,0,1)}}this.m_contactSolver.Initialize(a,this.m_contacts,
this.m_contactCount,this.m_allocator);c=this.m_contactSolver;c.InitVelocityConstraints(a);for(b=0;b<this.m_jointCount;++b){f=this.m_joints[b];f.InitVelocityConstraints(a)}for(b=0;b<a.velocityIterations;++b){for(e=0;e<this.m_jointCount;++e){f=this.m_joints[e];f.SolveVelocityConstraints(a)}c.SolveVelocityConstraints()}for(b=0;b<this.m_jointCount;++b){f=this.m_joints[b];f.FinalizeVelocityConstraints()}c.FinalizeVelocityConstraints();for(b=0;b<this.m_bodyCount;++b){e=this.m_bodies[b];if(e.GetType()!=
k.b2_staticBody){var m=a.dt*e.m_linearVelocity.x,r=a.dt*e.m_linearVelocity.y;if(m*m+r*r>A.b2_maxTranslationSquared){e.m_linearVelocity.Normalize();e.m_linearVelocity.x*=A.b2_maxTranslation*a.inv_dt;e.m_linearVelocity.y*=A.b2_maxTranslation*a.inv_dt}m=a.dt*e.m_angularVelocity;if(m*m>A.b2_maxRotationSquared)e.m_angularVelocity=e.m_angularVelocity<0?-A.b2_maxRotation*a.inv_dt:A.b2_maxRotation*a.inv_dt;e.m_sweep.c0.SetV(e.m_sweep.c);e.m_sweep.a0=e.m_sweep.a;e.m_sweep.c.x+=a.dt*e.m_linearVelocity.x;e.m_sweep.c.y+=
a.dt*e.m_linearVelocity.y;e.m_sweep.a+=a.dt*e.m_angularVelocity;e.SynchronizeTransform()}}for(b=0;b<a.positionIterations;++b){m=c.SolvePositionConstraints(A.b2_contactBaumgarte);r=true;for(e=0;e<this.m_jointCount;++e){f=this.m_joints[e];f=f.SolvePositionConstraints(A.b2_contactBaumgarte);r=r&&f}if(m&&r)break}this.Report(c.m_constraints);if(g){g=Number.MAX_VALUE;c=A.b2_linearSleepTolerance*A.b2_linearSleepTolerance;m=A.b2_angularSleepTolerance*A.b2_angularSleepTolerance;for(b=0;b<this.m_bodyCount;++b){e=
this.m_bodies[b];if(e.GetType()!=k.b2_staticBody){if((e.m_flags&k.e_allowSleepFlag)==0)g=e.m_sleepTime=0;if((e.m_flags&k.e_allowSleepFlag)==0||e.m_angularVelocity*e.m_angularVelocity>m||F.Dot(e.m_linearVelocity,e.m_linearVelocity)>c)g=e.m_sleepTime=0;else{e.m_sleepTime+=a.dt;g=F.Min(g,e.m_sleepTime)}}}if(g>=A.b2_timeToSleep)for(b=0;b<this.m_bodyCount;++b){e=this.m_bodies[b];e.SetAwake(false)}}};Z.prototype.SolveTOI=function(a){var c=0,g=0;this.m_contactSolver.Initialize(a,this.m_contacts,this.m_contactCount,
this.m_allocator);var b=this.m_contactSolver;for(c=0;c<this.m_jointCount;++c)this.m_joints[c].InitVelocityConstraints(a);for(c=0;c<a.velocityIterations;++c){b.SolveVelocityConstraints();for(g=0;g<this.m_jointCount;++g)this.m_joints[g].SolveVelocityConstraints(a)}for(c=0;c<this.m_bodyCount;++c){g=this.m_bodies[c];if(g.GetType()!=k.b2_staticBody){var e=a.dt*g.m_linearVelocity.x,f=a.dt*g.m_linearVelocity.y;if(e*e+f*f>A.b2_maxTranslationSquared){g.m_linearVelocity.Normalize();g.m_linearVelocity.x*=A.b2_maxTranslation*
a.inv_dt;g.m_linearVelocity.y*=A.b2_maxTranslation*a.inv_dt}e=a.dt*g.m_angularVelocity;if(e*e>A.b2_maxRotationSquared)g.m_angularVelocity=g.m_angularVelocity<0?-A.b2_maxRotation*a.inv_dt:A.b2_maxRotation*a.inv_dt;g.m_sweep.c0.SetV(g.m_sweep.c);g.m_sweep.a0=g.m_sweep.a;g.m_sweep.c.x+=a.dt*g.m_linearVelocity.x;g.m_sweep.c.y+=a.dt*g.m_linearVelocity.y;g.m_sweep.a+=a.dt*g.m_angularVelocity;g.SynchronizeTransform()}}for(c=0;c<a.positionIterations;++c){e=b.SolvePositionConstraints(0.75);f=true;for(g=0;g<
this.m_jointCount;++g){var m=this.m_joints[g].SolvePositionConstraints(A.b2_contactBaumgarte);f=f&&m}if(e&&f)break}this.Report(b.m_constraints)};Z.prototype.Report=function(a){if(this.m_listener!=null)for(var c=0;c<this.m_contactCount;++c){for(var g=this.m_contacts[c],b=a[c],e=0;e<b.pointCount;++e){Z.s_impulse.normalImpulses[e]=b.points[e].normalImpulse;Z.s_impulse.tangentImpulses[e]=b.points[e].tangentImpulse}this.m_listener.PostSolve(g,Z.s_impulse)}};Z.prototype.AddBody=function(a){a.m_islandIndex=
this.m_bodyCount;this.m_bodies[this.m_bodyCount++]=a};Z.prototype.AddContact=function(a){this.m_contacts[this.m_contactCount++]=a};Z.prototype.AddJoint=function(a){this.m_joints[this.m_jointCount++]=a};Box2D.postDefs.push(function(){Box2D.Dynamics.b2Island.s_impulse=new D});d.b2TimeStep=function(){};d.prototype.Set=function(a){this.dt=a.dt;this.inv_dt=a.inv_dt;this.positionIterations=a.positionIterations;this.velocityIterations=a.velocityIterations;this.warmStarting=a.warmStarting};h.b2World=function(){this.s_stack=
new Vector;this.m_contactManager=new O;this.m_contactSolver=new o;this.m_island=new Z};h.prototype.b2World=function(a,c){this.m_controllerList=this.m_jointList=this.m_contactList=this.m_bodyList=this.m_debugDraw=this.m_destructionListener=null;this.m_controllerCount=this.m_jointCount=this.m_contactCount=this.m_bodyCount=0;h.m_warmStarting=true;h.m_continuousPhysics=true;this.m_allowSleep=c;this.m_gravity=a;this.m_inv_dt0=0;this.m_contactManager.m_world=this;this.m_groundBody=this.CreateBody(new z)};
h.prototype.SetDestructionListener=function(a){this.m_destructionListener=a};h.prototype.SetContactFilter=function(a){this.m_contactManager.m_contactFilter=a};h.prototype.SetContactListener=function(a){this.m_contactManager.m_contactListener=a};h.prototype.SetDebugDraw=function(a){this.m_debugDraw=a};h.prototype.SetBroadPhase=function(a){var c=this.m_contactManager.m_broadPhase;this.m_contactManager.m_broadPhase=a;for(var g=this.m_bodyList;g;g=g.m_next)for(var b=g.m_fixtureList;b;b=b.m_next)b.m_proxy=
a.CreateProxy(c.GetFatAABB(b.m_proxy),b)};h.prototype.Validate=function(){this.m_contactManager.m_broadPhase.Validate()};h.prototype.GetProxyCount=function(){return this.m_contactManager.m_broadPhase.GetProxyCount()};h.prototype.CreateBody=function(a){if(this.IsLocked()==true)return null;a=new k(a,this);a.m_prev=null;if(a.m_next=this.m_bodyList)this.m_bodyList.m_prev=a;this.m_bodyList=a;++this.m_bodyCount;return a};h.prototype.DestroyBody=function(a){if(this.IsLocked()!=true){for(var c=a.m_jointList;c;){var g=
c;c=c.next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeJoint(g.joint);this.DestroyJoint(g.joint)}for(c=a.m_controllerList;c;){g=c;c=c.nextController;g.controller.RemoveBody(a)}for(c=a.m_contactList;c;){g=c;c=c.next;this.m_contactManager.Destroy(g.contact)}a.m_contactList=null;for(c=a.m_fixtureList;c;){g=c;c=c.m_next;this.m_destructionListener&&this.m_destructionListener.SayGoodbyeFixture(g);g.DestroyProxy(this.m_contactManager.m_broadPhase);g.Destroy()}a.m_fixtureList=null;a.m_fixtureCount=
0;if(a.m_prev)a.m_prev.m_next=a.m_next;if(a.m_next)a.m_next.m_prev=a.m_prev;if(a==this.m_bodyList)this.m_bodyList=a.m_next;--this.m_bodyCount}};h.prototype.CreateJoint=function(a){var c=q.Create(a,null);c.m_prev=null;if(c.m_next=this.m_jointList)this.m_jointList.m_prev=c;this.m_jointList=c;++this.m_jointCount;c.m_edgeA.joint=c;c.m_edgeA.other=c.m_bodyB;c.m_edgeA.prev=null;if(c.m_edgeA.next=c.m_bodyA.m_jointList)c.m_bodyA.m_jointList.prev=c.m_edgeA;c.m_bodyA.m_jointList=c.m_edgeA;c.m_edgeB.joint=c;
c.m_edgeB.other=c.m_bodyA;c.m_edgeB.prev=null;if(c.m_edgeB.next=c.m_bodyB.m_jointList)c.m_bodyB.m_jointList.prev=c.m_edgeB;c.m_bodyB.m_jointList=c.m_edgeB;var g=a.bodyA,b=a.bodyB;if(a.collideConnected==false)for(a=b.GetContactList();a;){a.other==g&&a.contact.FlagForFiltering();a=a.next}return c};h.prototype.DestroyJoint=function(a){var c=a.m_collideConnected;if(a.m_prev)a.m_prev.m_next=a.m_next;if(a.m_next)a.m_next.m_prev=a.m_prev;if(a==this.m_jointList)this.m_jointList=a.m_next;var g=a.m_bodyA,b=
a.m_bodyB;g.SetAwake(true);b.SetAwake(true);if(a.m_edgeA.prev)a.m_edgeA.prev.next=a.m_edgeA.next;if(a.m_edgeA.next)a.m_edgeA.next.prev=a.m_edgeA.prev;if(a.m_edgeA==g.m_jointList)g.m_jointList=a.m_edgeA.next;a.m_edgeA.prev=null;a.m_edgeA.next=null;if(a.m_edgeB.prev)a.m_edgeB.prev.next=a.m_edgeB.next;if(a.m_edgeB.next)a.m_edgeB.next.prev=a.m_edgeB.prev;if(a.m_edgeB==b.m_jointList)b.m_jointList=a.m_edgeB.next;a.m_edgeB.prev=null;a.m_edgeB.next=null;q.Destroy(a,null);--this.m_jointCount;if(c==false)for(a=
b.GetContactList();a;){a.other==g&&a.contact.FlagForFiltering();a=a.next}};h.prototype.AddController=function(a){a.m_next=this.m_controllerList;a.m_prev=null;this.m_controllerList=a;a.m_world=this;this.m_controllerCount++;return a};h.prototype.RemoveController=function(a){if(a.m_prev)a.m_prev.m_next=a.m_next;if(a.m_next)a.m_next.m_prev=a.m_prev;if(this.m_controllerList==a)this.m_controllerList=a.m_next;this.m_controllerCount--};h.prototype.CreateController=function(a){if(a.m_world!=this)throw Error("Controller can only be a member of one world");
a.m_next=this.m_controllerList;a.m_prev=null;if(this.m_controllerList)this.m_controllerList.m_prev=a;this.m_controllerList=a;++this.m_controllerCount;a.m_world=this;return a};h.prototype.DestroyController=function(a){a.Clear();if(a.m_next)a.m_next.m_prev=a.m_prev;if(a.m_prev)a.m_prev.m_next=a.m_next;if(a==this.m_controllerList)this.m_controllerList=a.m_next;--this.m_controllerCount};h.prototype.SetWarmStarting=function(a){h.m_warmStarting=a};h.prototype.SetContinuousPhysics=function(a){h.m_continuousPhysics=
a};h.prototype.GetBodyCount=function(){return this.m_bodyCount};h.prototype.GetJointCount=function(){return this.m_jointCount};h.prototype.GetContactCount=function(){return this.m_contactCount};h.prototype.SetGravity=function(a){this.m_gravity=a};h.prototype.GetGravity=function(){return this.m_gravity};h.prototype.GetGroundBody=function(){return this.m_groundBody};h.prototype.Step=function(a,c,g){if(a===undefined)a=0;if(c===undefined)c=0;if(g===undefined)g=0;if(this.m_flags&h.e_newFixture){this.m_contactManager.FindNewContacts();
this.m_flags&=~h.e_newFixture}this.m_flags|=h.e_locked;var b=h.s_timestep2;b.dt=a;b.velocityIterations=c;b.positionIterations=g;b.inv_dt=a>0?1/a:0;b.dtRatio=this.m_inv_dt0*a;b.warmStarting=h.m_warmStarting;this.m_contactManager.Collide();b.dt>0&&this.Solve(b);h.m_continuousPhysics&&b.dt>0&&this.SolveTOI(b);if(b.dt>0)this.m_inv_dt0=b.inv_dt;this.m_flags&=~h.e_locked};h.prototype.ClearForces=function(){for(var a=this.m_bodyList;a;a=a.m_next){a.m_force.SetZero();a.m_torque=0}};h.prototype.DrawDebugData=
function(){if(this.m_debugDraw!=null){this.m_debugDraw.m_sprite.graphics.clear();var a=this.m_debugDraw.GetFlags(),c,g,b;new y;new y;new y;var e;new U;new U;e=[new y,new y,new y,new y];var f=new w(0,0,0);if(a&E.e_shapeBit)for(c=this.m_bodyList;c;c=c.m_next){e=c.m_xf;for(g=c.GetFixtureList();g;g=g.m_next){b=g.GetShape();if(c.IsActive()==false)f.Set(0.5,0.5,0.3);else if(c.GetType()==k.b2_staticBody)f.Set(0.5,0.9,0.5);else if(c.GetType()==k.b2_kinematicBody)f.Set(0.5,0.5,0.9);else c.IsAwake()==false?
f.Set(0.6,0.6,0.6):f.Set(0.9,0.7,0.7);this.DrawShape(b,e,f)}}if(a&E.e_jointBit)for(c=this.m_jointList;c;c=c.m_next)this.DrawJoint(c);if(a&E.e_controllerBit)for(c=this.m_controllerList;c;c=c.m_next)c.Draw(this.m_debugDraw);if(a&E.e_pairBit){f.Set(0.3,0.9,0.9);for(c=this.m_contactManager.m_contactList;c;c=c.GetNext()){b=c.GetFixtureA();g=c.GetFixtureB();b=b.GetAABB().GetCenter();g=g.GetAABB().GetCenter();this.m_debugDraw.DrawSegment(b,g,f)}}if(a&E.e_aabbBit){b=this.m_contactManager.m_broadPhase;e=[new y,
new y,new y,new y];for(c=this.m_bodyList;c;c=c.GetNext())if(c.IsActive()!=false)for(g=c.GetFixtureList();g;g=g.GetNext()){var m=b.GetFatAABB(g.m_proxy);e[0].Set(m.lowerBound.x,m.lowerBound.y);e[1].Set(m.upperBound.x,m.lowerBound.y);e[2].Set(m.upperBound.x,m.upperBound.y);e[3].Set(m.lowerBound.x,m.upperBound.y);this.m_debugDraw.DrawPolygon(e,4,f)}}if(a&E.e_centerOfMassBit)for(c=this.m_bodyList;c;c=c.m_next){e=h.s_xf;e.R=c.m_xf.R;e.position=c.GetWorldCenter();this.m_debugDraw.DrawTransform(e)}}};h.prototype.QueryAABB=
function(a,c){var g=this.m_contactManager.m_broadPhase;g.Query(function(b){return a(g.GetUserData(b))},c)};h.prototype.QueryShape=function(a,c,g){if(g===undefined)g=null;if(g==null){g=new K;g.SetIdentity()}var b=this.m_contactManager.m_broadPhase,e=new U;c.ComputeAABB(e,g);b.Query(function(f){f=b.GetUserData(f)instanceof S?b.GetUserData(f):null;if(Y.TestOverlap(c,g,f.GetShape(),f.GetBody().GetTransform()))return a(f);return true},e)};h.prototype.QueryPoint=function(a,c){var g=this.m_contactManager.m_broadPhase,
b=new U;b.lowerBound.Set(c.x-A.b2_linearSlop,c.y-A.b2_linearSlop);b.upperBound.Set(c.x+A.b2_linearSlop,c.y+A.b2_linearSlop);g.Query(function(e){e=g.GetUserData(e)instanceof S?g.GetUserData(e):null;if(e.TestPoint(c))return a(e);return true},b)};h.prototype.RayCast=function(a,c,g){var b=this.m_contactManager.m_broadPhase,e=new V,f=new Q(c,g);b.RayCast(function(m,r){var s=b.GetUserData(r);s=s instanceof S?s:null;if(s.RayCast(e,m)){var v=e.fraction,t=new y((1-v)*c.x+v*g.x,(1-v)*c.y+v*g.y);return a(s,
t,e.normal,v)}return m.maxFraction},f)};h.prototype.RayCastOne=function(a,c){var g;this.RayCast(function(b,e,f,m){if(m===undefined)m=0;g=b;return m},a,c);return g};h.prototype.RayCastAll=function(a,c){var g=new Vector;this.RayCast(function(b){g[g.length]=b;return 1},a,c);return g};h.prototype.GetBodyList=function(){return this.m_bodyList};h.prototype.GetJointList=function(){return this.m_jointList};h.prototype.GetContactList=function(){return this.m_contactList};h.prototype.IsLocked=function(){return(this.m_flags&
h.e_locked)>0};h.prototype.Solve=function(a){for(var c,g=this.m_controllerList;g;g=g.m_next)g.Step(a);g=this.m_island;g.Initialize(this.m_bodyCount,this.m_contactCount,this.m_jointCount,null,this.m_contactManager.m_contactListener,this.m_contactSolver);for(c=this.m_bodyList;c;c=c.m_next)c.m_flags&=~k.e_islandFlag;for(var b=this.m_contactList;b;b=b.m_next)b.m_flags&=~l.e_islandFlag;for(b=this.m_jointList;b;b=b.m_next)b.m_islandFlag=false;parseInt(this.m_bodyCount);b=this.s_stack;for(var e=this.m_bodyList;e;e=
e.m_next)if(!(e.m_flags&k.e_islandFlag))if(!(e.IsAwake()==false||e.IsActive()==false))if(e.GetType()!=k.b2_staticBody){g.Clear();var f=0;b[f++]=e;for(e.m_flags|=k.e_islandFlag;f>0;){c=b[--f];g.AddBody(c);c.IsAwake()==false&&c.SetAwake(true);if(c.GetType()!=k.b2_staticBody){for(var m,r=c.m_contactList;r;r=r.next)if(!(r.contact.m_flags&l.e_islandFlag))if(!(r.contact.IsSensor()==true||r.contact.IsEnabled()==false||r.contact.IsTouching()==false)){g.AddContact(r.contact);r.contact.m_flags|=l.e_islandFlag;
m=r.other;if(!(m.m_flags&k.e_islandFlag)){b[f++]=m;m.m_flags|=k.e_islandFlag}}for(c=c.m_jointList;c;c=c.next)if(c.joint.m_islandFlag!=true){m=c.other;if(m.IsActive()!=false){g.AddJoint(c.joint);c.joint.m_islandFlag=true;if(!(m.m_flags&k.e_islandFlag)){b[f++]=m;m.m_flags|=k.e_islandFlag}}}}}g.Solve(a,this.m_gravity,this.m_allowSleep);for(f=0;f<g.m_bodyCount;++f){c=g.m_bodies[f];if(c.GetType()==k.b2_staticBody)c.m_flags&=~k.e_islandFlag}}for(f=0;f<b.length;++f){if(!b[f])break;b[f]=null}for(c=this.m_bodyList;c;c=
c.m_next)c.IsAwake()==false||c.IsActive()==false||c.GetType()!=k.b2_staticBody&&c.SynchronizeFixtures();this.m_contactManager.FindNewContacts()};h.prototype.SolveTOI=function(a){var c,g,b,e=this.m_island;e.Initialize(this.m_bodyCount,A.b2_maxTOIContactsPerIsland,A.b2_maxTOIJointsPerIsland,null,this.m_contactManager.m_contactListener,this.m_contactSolver);var f=h.s_queue;for(c=this.m_bodyList;c;c=c.m_next){c.m_flags&=~k.e_islandFlag;c.m_sweep.t0=0}for(b=this.m_contactList;b;b=b.m_next)b.m_flags&=~(l.e_toiFlag|
l.e_islandFlag);for(b=this.m_jointList;b;b=b.m_next)b.m_islandFlag=false;for(;;){var m=null,r=1;for(b=this.m_contactList;b;b=b.m_next)if(!(b.IsSensor()==true||b.IsEnabled()==false||b.IsContinuous()==false)){c=1;if(b.m_flags&l.e_toiFlag)c=b.m_toi;else{c=b.m_fixtureA;g=b.m_fixtureB;c=c.m_body;g=g.m_body;if((c.GetType()!=k.b2_dynamicBody||c.IsAwake()==false)&&(g.GetType()!=k.b2_dynamicBody||g.IsAwake()==false))continue;var s=c.m_sweep.t0;if(c.m_sweep.t0<g.m_sweep.t0){s=g.m_sweep.t0;c.m_sweep.Advance(s)}else if(g.m_sweep.t0<
c.m_sweep.t0){s=c.m_sweep.t0;g.m_sweep.Advance(s)}c=b.ComputeTOI(c.m_sweep,g.m_sweep);A.b2Assert(0<=c&&c<=1);if(c>0&&c<1){c=(1-c)*s+c;if(c>1)c=1}b.m_toi=c;b.m_flags|=l.e_toiFlag}if(Number.MIN_VALUE<c&&c<r){m=b;r=c}}if(m==null||1-100*Number.MIN_VALUE<r)break;c=m.m_fixtureA;g=m.m_fixtureB;c=c.m_body;g=g.m_body;h.s_backupA.Set(c.m_sweep);h.s_backupB.Set(g.m_sweep);c.Advance(r);g.Advance(r);m.Update(this.m_contactManager.m_contactListener);m.m_flags&=~l.e_toiFlag;if(m.IsSensor()==true||m.IsEnabled()==
false){c.m_sweep.Set(h.s_backupA);g.m_sweep.Set(h.s_backupB);c.SynchronizeTransform();g.SynchronizeTransform()}else if(m.IsTouching()!=false){c=c;if(c.GetType()!=k.b2_dynamicBody)c=g;e.Clear();m=b=0;f[b+m++]=c;for(c.m_flags|=k.e_islandFlag;m>0;){c=f[b++];--m;e.AddBody(c);c.IsAwake()==false&&c.SetAwake(true);if(c.GetType()==k.b2_dynamicBody){for(g=c.m_contactList;g;g=g.next){if(e.m_contactCount==e.m_contactCapacity)break;if(!(g.contact.m_flags&l.e_islandFlag))if(!(g.contact.IsSensor()==true||g.contact.IsEnabled()==
false||g.contact.IsTouching()==false)){e.AddContact(g.contact);g.contact.m_flags|=l.e_islandFlag;s=g.other;if(!(s.m_flags&k.e_islandFlag)){if(s.GetType()!=k.b2_staticBody){s.Advance(r);s.SetAwake(true)}f[b+m]=s;++m;s.m_flags|=k.e_islandFlag}}}for(c=c.m_jointList;c;c=c.next)if(e.m_jointCount!=e.m_jointCapacity)if(c.joint.m_islandFlag!=true){s=c.other;if(s.IsActive()!=false){e.AddJoint(c.joint);c.joint.m_islandFlag=true;if(!(s.m_flags&k.e_islandFlag)){if(s.GetType()!=k.b2_staticBody){s.Advance(r);s.SetAwake(true)}f[b+
m]=s;++m;s.m_flags|=k.e_islandFlag}}}}}b=h.s_timestep;b.warmStarting=false;b.dt=(1-r)*a.dt;b.inv_dt=1/b.dt;b.dtRatio=0;b.velocityIterations=a.velocityIterations;b.positionIterations=a.positionIterations;e.SolveTOI(b);for(r=r=0;r<e.m_bodyCount;++r){c=e.m_bodies[r];c.m_flags&=~k.e_islandFlag;if(c.IsAwake()!=false)if(c.GetType()==k.b2_dynamicBody){c.SynchronizeFixtures();for(g=c.m_contactList;g;g=g.next)g.contact.m_flags&=~l.e_toiFlag}}for(r=0;r<e.m_contactCount;++r){b=e.m_contacts[r];b.m_flags&=~(l.e_toiFlag|
l.e_islandFlag)}for(r=0;r<e.m_jointCount;++r){b=e.m_joints[r];b.m_islandFlag=false}this.m_contactManager.FindNewContacts()}}};h.prototype.DrawJoint=function(a){var c=a.GetBodyA(),g=a.GetBodyB(),b=c.m_xf.position,e=g.m_xf.position,f=a.GetAnchorA(),m=a.GetAnchorB(),r=h.s_jointColor;switch(a.m_type){case q.e_distanceJoint:this.m_debugDraw.DrawSegment(f,m,r);break;case q.e_pulleyJoint:c=a instanceof n?a:null;a=c.GetGroundAnchorA();c=c.GetGroundAnchorB();this.m_debugDraw.DrawSegment(a,f,r);this.m_debugDraw.DrawSegment(c,
m,r);this.m_debugDraw.DrawSegment(a,c,r);break;case q.e_mouseJoint:this.m_debugDraw.DrawSegment(f,m,r);break;default:c!=this.m_groundBody&&this.m_debugDraw.DrawSegment(b,f,r);this.m_debugDraw.DrawSegment(f,m,r);g!=this.m_groundBody&&this.m_debugDraw.DrawSegment(e,m,r)}};h.prototype.DrawShape=function(a,c,g){switch(a.m_type){case Y.e_circleShape:var b=a instanceof M?a:null;this.m_debugDraw.DrawSolidCircle(F.MulX(c,b.m_p),b.m_radius,c.R.col1,g);break;case Y.e_polygonShape:b=0;b=a instanceof W?a:null;
a=parseInt(b.GetVertexCount());var e=b.GetVertices(),f=new Vector(a);for(b=0;b<a;++b)f[b]=F.MulX(c,e[b]);this.m_debugDraw.DrawSolidPolygon(f,a,g);break;case Y.e_edgeShape:b=a instanceof L?a:null;this.m_debugDraw.DrawSegment(F.MulX(c,b.GetVertex1()),F.MulX(c,b.GetVertex2()),g)}};Box2D.postDefs.push(function(){Box2D.Dynamics.b2World.s_timestep2=new d;Box2D.Dynamics.b2World.s_xf=new K;Box2D.Dynamics.b2World.s_backupA=new G;Box2D.Dynamics.b2World.s_backupB=new G;Box2D.Dynamics.b2World.s_timestep=new d;
Box2D.Dynamics.b2World.s_queue=new Vector;Box2D.Dynamics.b2World.s_jointColor=new w(0.5,0.8,0.8);Box2D.Dynamics.b2World.e_newFixture=1;Box2D.Dynamics.b2World.e_locked=2})})();
(function(){var F=Box2D.Collision.Shapes.b2CircleShape,G=Box2D.Collision.Shapes.b2EdgeShape,K=Box2D.Collision.Shapes.b2PolygonShape,y=Box2D.Collision.Shapes.b2Shape,w=Box2D.Dynamics.Contacts.b2CircleContact,A=Box2D.Dynamics.Contacts.b2Contact,U=Box2D.Dynamics.Contacts.b2ContactConstraint,p=Box2D.Dynamics.Contacts.b2ContactConstraintPoint,B=Box2D.Dynamics.Contacts.b2ContactEdge,Q=Box2D.Dynamics.Contacts.b2ContactFactory,V=Box2D.Dynamics.Contacts.b2ContactRegister,M=Box2D.Dynamics.Contacts.b2ContactResult,
L=Box2D.Dynamics.Contacts.b2ContactSolver,I=Box2D.Dynamics.Contacts.b2EdgeAndCircleContact,W=Box2D.Dynamics.Contacts.b2NullContact,Y=Box2D.Dynamics.Contacts.b2PolyAndCircleContact,k=Box2D.Dynamics.Contacts.b2PolyAndEdgeContact,z=Box2D.Dynamics.Contacts.b2PolygonContact,u=Box2D.Dynamics.Contacts.b2PositionSolverManifold,D=Box2D.Dynamics.b2Body,H=Box2D.Dynamics.b2TimeStep,O=Box2D.Common.b2Settings,E=Box2D.Common.Math.b2Mat22,R=Box2D.Common.Math.b2Math,N=Box2D.Common.Math.b2Vec2,S=Box2D.Collision.b2Collision,
aa=Box2D.Collision.b2ContactID,Z=Box2D.Collision.b2Manifold,d=Box2D.Collision.b2TimeOfImpact,h=Box2D.Collision.b2TOIInput,l=Box2D.Collision.b2WorldManifold;Box2D.inherit(w,Box2D.Dynamics.Contacts.b2Contact);w.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;w.b2CircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};w.Create=function(){return new w};w.Destroy=function(){};w.prototype.Reset=function(j,o){this.__super.Reset.call(this,j,o)};w.prototype.Evaluate=
function(){var j=this.m_fixtureA.GetBody(),o=this.m_fixtureB.GetBody();S.CollideCircles(this.m_manifold,this.m_fixtureA.GetShape()instanceof F?this.m_fixtureA.GetShape():null,j.m_xf,this.m_fixtureB.GetShape()instanceof F?this.m_fixtureB.GetShape():null,o.m_xf)};A.b2Contact=function(){this.m_nodeA=new B;this.m_nodeB=new B;this.m_manifold=new Z;this.m_oldManifold=new Z};A.prototype.GetManifold=function(){return this.m_manifold};A.prototype.GetWorldManifold=function(j){var o=this.m_fixtureA.GetBody(),
q=this.m_fixtureB.GetBody(),n=this.m_fixtureA.GetShape(),a=this.m_fixtureB.GetShape();j.Initialize(this.m_manifold,o.GetTransform(),n.m_radius,q.GetTransform(),a.m_radius)};A.prototype.IsTouching=function(){return(this.m_flags&A.e_touchingFlag)==A.e_touchingFlag};A.prototype.IsContinuous=function(){return(this.m_flags&A.e_continuousFlag)==A.e_continuousFlag};A.prototype.SetSensor=function(j){if(j)this.m_flags|=A.e_sensorFlag;else this.m_flags&=~A.e_sensorFlag};A.prototype.IsSensor=function(){return(this.m_flags&
A.e_sensorFlag)==A.e_sensorFlag};A.prototype.SetEnabled=function(j){if(j)this.m_flags|=A.e_enabledFlag;else this.m_flags&=~A.e_enabledFlag};A.prototype.IsEnabled=function(){return(this.m_flags&A.e_enabledFlag)==A.e_enabledFlag};A.prototype.GetNext=function(){return this.m_next};A.prototype.GetFixtureA=function(){return this.m_fixtureA};A.prototype.GetFixtureB=function(){return this.m_fixtureB};A.prototype.FlagForFiltering=function(){this.m_flags|=A.e_filterFlag};A.prototype.b2Contact=function(){};
A.prototype.Reset=function(j,o){if(j===undefined)j=null;if(o===undefined)o=null;this.m_flags=A.e_enabledFlag;if(!j||!o)this.m_fixtureB=this.m_fixtureA=null;else{if(j.IsSensor()||o.IsSensor())this.m_flags|=A.e_sensorFlag;var q=j.GetBody(),n=o.GetBody();if(q.GetType()!=D.b2_dynamicBody||q.IsBullet()||n.GetType()!=D.b2_dynamicBody||n.IsBullet())this.m_flags|=A.e_continuousFlag;this.m_fixtureA=j;this.m_fixtureB=o;this.m_manifold.m_pointCount=0;this.m_next=this.m_prev=null;this.m_nodeA.contact=null;this.m_nodeA.prev=
null;this.m_nodeA.next=null;this.m_nodeA.other=null;this.m_nodeB.contact=null;this.m_nodeB.prev=null;this.m_nodeB.next=null;this.m_nodeB.other=null}};A.prototype.Update=function(j){var o=this.m_oldManifold;this.m_oldManifold=this.m_manifold;this.m_manifold=o;this.m_flags|=A.e_enabledFlag;var q=false;o=(this.m_flags&A.e_touchingFlag)==A.e_touchingFlag;var n=this.m_fixtureA.m_body,a=this.m_fixtureB.m_body,c=this.m_fixtureA.m_aabb.TestOverlap(this.m_fixtureB.m_aabb);if(this.m_flags&A.e_sensorFlag){if(c){q=
this.m_fixtureA.GetShape();c=this.m_fixtureB.GetShape();n=n.GetTransform();a=a.GetTransform();q=y.TestOverlap(q,n,c,a)}this.m_manifold.m_pointCount=0}else{if(n.GetType()!=D.b2_dynamicBody||n.IsBullet()||a.GetType()!=D.b2_dynamicBody||a.IsBullet())this.m_flags|=A.e_continuousFlag;else this.m_flags&=~A.e_continuousFlag;if(c){this.Evaluate();q=this.m_manifold.m_pointCount>0;for(c=0;c<this.m_manifold.m_pointCount;++c){var g=this.m_manifold.m_points[c];g.m_normalImpulse=0;g.m_tangentImpulse=0;for(var b=
g.m_id,e=0;e<this.m_oldManifold.m_pointCount;++e){var f=this.m_oldManifold.m_points[e];if(f.m_id.key==b.key){g.m_normalImpulse=f.m_normalImpulse;g.m_tangentImpulse=f.m_tangentImpulse;break}}}}else this.m_manifold.m_pointCount=0;if(q!=o){n.SetAwake(true);a.SetAwake(true)}}if(q)this.m_flags|=A.e_touchingFlag;else this.m_flags&=~A.e_touchingFlag;o==false&&q==true&&j.BeginContact(this);o==true&&q==false&&j.EndContact(this);(this.m_flags&A.e_sensorFlag)==0&&j.PreSolve(this,this.m_oldManifold)};A.prototype.Evaluate=
function(){};A.prototype.ComputeTOI=function(j,o){A.s_input.proxyA.Set(this.m_fixtureA.GetShape());A.s_input.proxyB.Set(this.m_fixtureB.GetShape());A.s_input.sweepA=j;A.s_input.sweepB=o;A.s_input.tolerance=O.b2_linearSlop;return d.TimeOfImpact(A.s_input)};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2Contact.e_sensorFlag=1;Box2D.Dynamics.Contacts.b2Contact.e_continuousFlag=2;Box2D.Dynamics.Contacts.b2Contact.e_islandFlag=4;Box2D.Dynamics.Contacts.b2Contact.e_toiFlag=8;Box2D.Dynamics.Contacts.b2Contact.e_touchingFlag=
16;Box2D.Dynamics.Contacts.b2Contact.e_enabledFlag=32;Box2D.Dynamics.Contacts.b2Contact.e_filterFlag=64;Box2D.Dynamics.Contacts.b2Contact.s_input=new h});U.b2ContactConstraint=function(){this.localPlaneNormal=new N;this.localPoint=new N;this.normal=new N;this.normalMass=new E;this.K=new E};U.prototype.b2ContactConstraint=function(){this.points=new Vector(O.b2_maxManifoldPoints);for(var j=0;j<O.b2_maxManifoldPoints;j++)this.points[j]=new p};p.b2ContactConstraintPoint=function(){this.localPoint=new N;
this.rA=new N;this.rB=new N};B.b2ContactEdge=function(){};Q.b2ContactFactory=function(){};Q.prototype.b2ContactFactory=function(j){this.m_allocator=j;this.InitializeRegisters()};Q.prototype.AddType=function(j,o,q,n){if(q===undefined)q=0;if(n===undefined)n=0;this.m_registers[q][n].createFcn=j;this.m_registers[q][n].destroyFcn=o;this.m_registers[q][n].primary=true;if(q!=n){this.m_registers[n][q].createFcn=j;this.m_registers[n][q].destroyFcn=o;this.m_registers[n][q].primary=false}};Q.prototype.InitializeRegisters=
function(){this.m_registers=new Vector(y.e_shapeTypeCount);for(var j=0;j<y.e_shapeTypeCount;j++){this.m_registers[j]=new Vector(y.e_shapeTypeCount);for(var o=0;o<y.e_shapeTypeCount;o++)this.m_registers[j][o]=new V}this.AddType(w.Create,w.Destroy,y.e_circleShape,y.e_circleShape);this.AddType(Y.Create,Y.Destroy,y.e_polygonShape,y.e_circleShape);this.AddType(z.Create,z.Destroy,y.e_polygonShape,y.e_polygonShape);this.AddType(I.Create,I.Destroy,y.e_edgeShape,y.e_circleShape);this.AddType(k.Create,k.Destroy,
y.e_polygonShape,y.e_edgeShape)};Q.prototype.Create=function(j,o){var q=parseInt(j.GetType()),n=parseInt(o.GetType());q=this.m_registers[q][n];if(q.pool){n=q.pool;q.pool=n.m_next;q.poolCount--;n.Reset(j,o);return n}n=q.createFcn;if(n!=null){if(q.primary){n=n(this.m_allocator);n.Reset(j,o)}else{n=n(this.m_allocator);n.Reset(o,j)}return n}else return null};Q.prototype.Destroy=function(j){if(j.m_manifold.m_pointCount>0){j.m_fixtureA.m_body.SetAwake(true);j.m_fixtureB.m_body.SetAwake(true)}var o=parseInt(j.m_fixtureA.GetType()),
q=parseInt(j.m_fixtureB.GetType());o=this.m_registers[o][q];o.poolCount++;j.m_next=o.pool;o.pool=j;o=o.destroyFcn;o(j,this.m_allocator)};V.b2ContactRegister=function(){};M.b2ContactResult=function(){this.position=new N;this.normal=new N;this.id=new aa};L.b2ContactSolver=function(){this.m_step=new H;this.m_constraints=new Vector};L.prototype.b2ContactSolver=function(){};L.prototype.Initialize=function(j,o,q,n){if(q===undefined)q=0;var a;this.m_step.Set(j);this.m_allocator=n;j=0;for(this.m_constraintCount=
q;this.m_constraints.length<this.m_constraintCount;)this.m_constraints[this.m_constraints.length]=new U;for(j=0;j<q;++j){a=o[j];n=a.m_fixtureA;var c=a.m_fixtureB,g=n.m_shape.m_radius,b=c.m_shape.m_radius,e=n.m_body,f=c.m_body,m=a.GetManifold(),r=O.b2MixFriction(n.GetFriction(),c.GetFriction()),s=O.b2MixRestitution(n.GetRestitution(),c.GetRestitution()),v=e.m_linearVelocity.x,t=e.m_linearVelocity.y,x=f.m_linearVelocity.x,C=f.m_linearVelocity.y,J=e.m_angularVelocity,T=f.m_angularVelocity;O.b2Assert(m.m_pointCount>
0);L.s_worldManifold.Initialize(m,e.m_xf,g,f.m_xf,b);c=L.s_worldManifold.m_normal.x;a=L.s_worldManifold.m_normal.y;n=this.m_constraints[j];n.bodyA=e;n.bodyB=f;n.manifold=m;n.normal.x=c;n.normal.y=a;n.pointCount=m.m_pointCount;n.friction=r;n.restitution=s;n.localPlaneNormal.x=m.m_localPlaneNormal.x;n.localPlaneNormal.y=m.m_localPlaneNormal.y;n.localPoint.x=m.m_localPoint.x;n.localPoint.y=m.m_localPoint.y;n.radius=g+b;n.type=m.m_type;for(g=0;g<n.pointCount;++g){r=m.m_points[g];b=n.points[g];b.normalImpulse=
r.m_normalImpulse;b.tangentImpulse=r.m_tangentImpulse;b.localPoint.SetV(r.m_localPoint);r=b.rA.x=L.s_worldManifold.m_points[g].x-e.m_sweep.c.x;s=b.rA.y=L.s_worldManifold.m_points[g].y-e.m_sweep.c.y;var P=b.rB.x=L.s_worldManifold.m_points[g].x-f.m_sweep.c.x,X=b.rB.y=L.s_worldManifold.m_points[g].y-f.m_sweep.c.y,$=r*a-s*c,ba=P*a-X*c;$*=$;ba*=ba;b.normalMass=1/(e.m_invMass+f.m_invMass+e.m_invI*$+f.m_invI*ba);var ca=e.m_mass*e.m_invMass+f.m_mass*f.m_invMass;ca+=e.m_mass*e.m_invI*$+f.m_mass*f.m_invI*ba;
b.equalizedMass=1/ca;ba=a;ca=-c;$=r*ca-s*ba;ba=P*ca-X*ba;$*=$;ba*=ba;b.tangentMass=1/(e.m_invMass+f.m_invMass+e.m_invI*$+f.m_invI*ba);b.velocityBias=0;r=n.normal.x*(x+-T*X-v- -J*s)+n.normal.y*(C+T*P-t-J*r);if(r<-O.b2_velocityThreshold)b.velocityBias+=-n.restitution*r}if(n.pointCount==2){C=n.points[0];x=n.points[1];m=e.m_invMass;e=e.m_invI;v=f.m_invMass;f=f.m_invI;t=C.rA.x*a-C.rA.y*c;C=C.rB.x*a-C.rB.y*c;J=x.rA.x*a-x.rA.y*c;x=x.rB.x*a-x.rB.y*c;c=m+v+e*t*t+f*C*C;a=m+v+e*J*J+f*x*x;f=m+v+e*t*J+f*C*x;if(c*
c<100*(c*a-f*f)){n.K.col1.Set(c,f);n.K.col2.Set(f,a);n.K.GetInverse(n.normalMass)}else n.pointCount=1}}};L.prototype.InitVelocityConstraints=function(j){for(var o=0;o<this.m_constraintCount;++o){var q=this.m_constraints[o],n=q.bodyA,a=q.bodyB,c=n.m_invMass,g=n.m_invI,b=a.m_invMass,e=a.m_invI,f=q.normal.x,m=q.normal.y,r=m,s=-f,v=0,t=0;if(j.warmStarting){t=q.pointCount;for(v=0;v<t;++v){var x=q.points[v];x.normalImpulse*=j.dtRatio;x.tangentImpulse*=j.dtRatio;var C=x.normalImpulse*f+x.tangentImpulse*
r,J=x.normalImpulse*m+x.tangentImpulse*s;n.m_angularVelocity-=g*(x.rA.x*J-x.rA.y*C);n.m_linearVelocity.x-=c*C;n.m_linearVelocity.y-=c*J;a.m_angularVelocity+=e*(x.rB.x*J-x.rB.y*C);a.m_linearVelocity.x+=b*C;a.m_linearVelocity.y+=b*J}}else{t=q.pointCount;for(v=0;v<t;++v){n=q.points[v];n.normalImpulse=0;n.tangentImpulse=0}}}};L.prototype.SolveVelocityConstraints=function(){for(var j=0,o,q=0,n=0,a=0,c=n=n=q=q=0,g=q=q=0,b=q=a=0,e=0,f,m=0;m<this.m_constraintCount;++m){a=this.m_constraints[m];var r=a.bodyA,
s=a.bodyB,v=r.m_angularVelocity,t=s.m_angularVelocity,x=r.m_linearVelocity,C=s.m_linearVelocity,J=r.m_invMass,T=r.m_invI,P=s.m_invMass,X=s.m_invI;b=a.normal.x;var $=e=a.normal.y;f=-b;g=a.friction;for(j=0;j<a.pointCount;j++){o=a.points[j];q=C.x-t*o.rB.y-x.x+v*o.rA.y;n=C.y+t*o.rB.x-x.y-v*o.rA.x;q=q*$+n*f;q=o.tangentMass*-q;n=g*o.normalImpulse;n=R.Clamp(o.tangentImpulse+q,-n,n);q=n-o.tangentImpulse;c=q*$;q=q*f;x.x-=J*c;x.y-=J*q;v-=T*(o.rA.x*q-o.rA.y*c);C.x+=P*c;C.y+=P*q;t+=X*(o.rB.x*q-o.rB.y*c);o.tangentImpulse=
n}parseInt(a.pointCount);if(a.pointCount==1){o=a.points[0];q=C.x+-t*o.rB.y-x.x- -v*o.rA.y;n=C.y+t*o.rB.x-x.y-v*o.rA.x;a=q*b+n*e;q=-o.normalMass*(a-o.velocityBias);n=o.normalImpulse+q;n=n>0?n:0;q=n-o.normalImpulse;c=q*b;q=q*e;x.x-=J*c;x.y-=J*q;v-=T*(o.rA.x*q-o.rA.y*c);C.x+=P*c;C.y+=P*q;t+=X*(o.rB.x*q-o.rB.y*c);o.normalImpulse=n}else{o=a.points[0];j=a.points[1];q=o.normalImpulse;g=j.normalImpulse;var ba=(C.x-t*o.rB.y-x.x+v*o.rA.y)*b+(C.y+t*o.rB.x-x.y-v*o.rA.x)*e,ca=(C.x-t*j.rB.y-x.x+v*j.rA.y)*b+(C.y+
t*j.rB.x-x.y-v*j.rA.x)*e;n=ba-o.velocityBias;c=ca-j.velocityBias;f=a.K;n-=f.col1.x*q+f.col2.x*g;for(c-=f.col1.y*q+f.col2.y*g;;){f=a.normalMass;$=-(f.col1.x*n+f.col2.x*c);f=-(f.col1.y*n+f.col2.y*c);if($>=0&&f>=0){q=$-q;g=f-g;a=q*b;q=q*e;b=g*b;e=g*e;x.x-=J*(a+b);x.y-=J*(q+e);v-=T*(o.rA.x*q-o.rA.y*a+j.rA.x*e-j.rA.y*b);C.x+=P*(a+b);C.y+=P*(q+e);t+=X*(o.rB.x*q-o.rB.y*a+j.rB.x*e-j.rB.y*b);o.normalImpulse=$;j.normalImpulse=f;break}$=-o.normalMass*n;f=0;ca=a.K.col1.y*$+c;if($>=0&&ca>=0){q=$-q;g=f-g;a=q*b;
q=q*e;b=g*b;e=g*e;x.x-=J*(a+b);x.y-=J*(q+e);v-=T*(o.rA.x*q-o.rA.y*a+j.rA.x*e-j.rA.y*b);C.x+=P*(a+b);C.y+=P*(q+e);t+=X*(o.rB.x*q-o.rB.y*a+j.rB.x*e-j.rB.y*b);o.normalImpulse=$;j.normalImpulse=f;break}$=0;f=-j.normalMass*c;ba=a.K.col2.x*f+n;if(f>=0&&ba>=0){q=$-q;g=f-g;a=q*b;q=q*e;b=g*b;e=g*e;x.x-=J*(a+b);x.y-=J*(q+e);v-=T*(o.rA.x*q-o.rA.y*a+j.rA.x*e-j.rA.y*b);C.x+=P*(a+b);C.y+=P*(q+e);t+=X*(o.rB.x*q-o.rB.y*a+j.rB.x*e-j.rB.y*b);o.normalImpulse=$;j.normalImpulse=f;break}f=$=0;ba=n;ca=c;if(ba>=0&&ca>=0){q=
$-q;g=f-g;a=q*b;q=q*e;b=g*b;e=g*e;x.x-=J*(a+b);x.y-=J*(q+e);v-=T*(o.rA.x*q-o.rA.y*a+j.rA.x*e-j.rA.y*b);C.x+=P*(a+b);C.y+=P*(q+e);t+=X*(o.rB.x*q-o.rB.y*a+j.rB.x*e-j.rB.y*b);o.normalImpulse=$;j.normalImpulse=f;break}break}}r.m_angularVelocity=v;s.m_angularVelocity=t}};L.prototype.FinalizeVelocityConstraints=function(){for(var j=0;j<this.m_constraintCount;++j)for(var o=this.m_constraints[j],q=o.manifold,n=0;n<o.pointCount;++n){var a=q.m_points[n],c=o.points[n];a.m_normalImpulse=c.normalImpulse;a.m_tangentImpulse=
c.tangentImpulse}};L.prototype.SolvePositionConstraints=function(j){if(j===undefined)j=0;for(var o=0,q=0;q<this.m_constraintCount;q++){var n=this.m_constraints[q],a=n.bodyA,c=n.bodyB,g=a.m_mass*a.m_invMass,b=a.m_mass*a.m_invI,e=c.m_mass*c.m_invMass,f=c.m_mass*c.m_invI;L.s_psm.Initialize(n);for(var m=L.s_psm.m_normal,r=0;r<n.pointCount;r++){var s=n.points[r],v=L.s_psm.m_points[r],t=L.s_psm.m_separations[r],x=v.x-a.m_sweep.c.x,C=v.y-a.m_sweep.c.y,J=v.x-c.m_sweep.c.x;v=v.y-c.m_sweep.c.y;o=o<t?o:t;t=
R.Clamp(j*(t+O.b2_linearSlop),-O.b2_maxLinearCorrection,0);t=-s.equalizedMass*t;s=t*m.x;t=t*m.y;a.m_sweep.c.x-=g*s;a.m_sweep.c.y-=g*t;a.m_sweep.a-=b*(x*t-C*s);a.SynchronizeTransform();c.m_sweep.c.x+=e*s;c.m_sweep.c.y+=e*t;c.m_sweep.a+=f*(J*t-v*s);c.SynchronizeTransform()}}return o>-1.5*O.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2ContactSolver.s_worldManifold=new l;Box2D.Dynamics.Contacts.b2ContactSolver.s_psm=new u});Box2D.inherit(I,Box2D.Dynamics.Contacts.b2Contact);
I.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;I.b2EdgeAndCircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};I.Create=function(){return new I};I.Destroy=function(){};I.prototype.Reset=function(j,o){this.__super.Reset.call(this,j,o)};I.prototype.Evaluate=function(){var j=this.m_fixtureA.GetBody(),o=this.m_fixtureB.GetBody();this.b2CollideEdgeAndCircle(this.m_manifold,this.m_fixtureA.GetShape()instanceof G?this.m_fixtureA.GetShape():null,j.m_xf,
this.m_fixtureB.GetShape()instanceof F?this.m_fixtureB.GetShape():null,o.m_xf)};I.prototype.b2CollideEdgeAndCircle=function(){};Box2D.inherit(W,Box2D.Dynamics.Contacts.b2Contact);W.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;W.b2NullContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};W.prototype.b2NullContact=function(){this.__super.b2Contact.call(this)};W.prototype.Evaluate=function(){};Box2D.inherit(Y,Box2D.Dynamics.Contacts.b2Contact);Y.prototype.__super=
Box2D.Dynamics.Contacts.b2Contact.prototype;Y.b2PolyAndCircleContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};Y.Create=function(){return new Y};Y.Destroy=function(){};Y.prototype.Reset=function(j,o){this.__super.Reset.call(this,j,o);O.b2Assert(j.GetType()==y.e_polygonShape);O.b2Assert(o.GetType()==y.e_circleShape)};Y.prototype.Evaluate=function(){var j=this.m_fixtureA.m_body,o=this.m_fixtureB.m_body;S.CollidePolygonAndCircle(this.m_manifold,this.m_fixtureA.GetShape()instanceof
K?this.m_fixtureA.GetShape():null,j.m_xf,this.m_fixtureB.GetShape()instanceof F?this.m_fixtureB.GetShape():null,o.m_xf)};Box2D.inherit(k,Box2D.Dynamics.Contacts.b2Contact);k.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;k.b2PolyAndEdgeContact=function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};k.Create=function(){return new k};k.Destroy=function(){};k.prototype.Reset=function(j,o){this.__super.Reset.call(this,j,o);O.b2Assert(j.GetType()==y.e_polygonShape);
O.b2Assert(o.GetType()==y.e_edgeShape)};k.prototype.Evaluate=function(){var j=this.m_fixtureA.GetBody(),o=this.m_fixtureB.GetBody();this.b2CollidePolyAndEdge(this.m_manifold,this.m_fixtureA.GetShape()instanceof K?this.m_fixtureA.GetShape():null,j.m_xf,this.m_fixtureB.GetShape()instanceof G?this.m_fixtureB.GetShape():null,o.m_xf)};k.prototype.b2CollidePolyAndEdge=function(){};Box2D.inherit(z,Box2D.Dynamics.Contacts.b2Contact);z.prototype.__super=Box2D.Dynamics.Contacts.b2Contact.prototype;z.b2PolygonContact=
function(){Box2D.Dynamics.Contacts.b2Contact.b2Contact.apply(this,arguments)};z.Create=function(){return new z};z.Destroy=function(){};z.prototype.Reset=function(j,o){this.__super.Reset.call(this,j,o)};z.prototype.Evaluate=function(){var j=this.m_fixtureA.GetBody(),o=this.m_fixtureB.GetBody();S.CollidePolygons(this.m_manifold,this.m_fixtureA.GetShape()instanceof K?this.m_fixtureA.GetShape():null,j.m_xf,this.m_fixtureB.GetShape()instanceof K?this.m_fixtureB.GetShape():null,o.m_xf)};u.b2PositionSolverManifold=
function(){};u.prototype.b2PositionSolverManifold=function(){this.m_normal=new N;this.m_separations=new Vector_a2j_Number(O.b2_maxManifoldPoints);this.m_points=new Vector(O.b2_maxManifoldPoints);for(var j=0;j<O.b2_maxManifoldPoints;j++)this.m_points[j]=new N};u.prototype.Initialize=function(j){O.b2Assert(j.pointCount>0);var o=0,q=0,n=0,a,c=0,g=0;switch(j.type){case Z.e_circles:a=j.bodyA.m_xf.R;n=j.localPoint;o=j.bodyA.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);q=j.bodyA.m_xf.position.y+(a.col1.y*
n.x+a.col2.y*n.y);a=j.bodyB.m_xf.R;n=j.points[0].localPoint;c=j.bodyB.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);a=j.bodyB.m_xf.position.y+(a.col1.y*n.x+a.col2.y*n.y);n=c-o;g=a-q;var b=n*n+g*g;if(b>Number.MIN_VALUE*Number.MIN_VALUE){b=Math.sqrt(b);this.m_normal.x=n/b;this.m_normal.y=g/b}else{this.m_normal.x=1;this.m_normal.y=0}this.m_points[0].x=0.5*(o+c);this.m_points[0].y=0.5*(q+a);this.m_separations[0]=n*this.m_normal.x+g*this.m_normal.y-j.radius;break;case Z.e_faceA:a=j.bodyA.m_xf.R;n=j.localPlaneNormal;
this.m_normal.x=a.col1.x*n.x+a.col2.x*n.y;this.m_normal.y=a.col1.y*n.x+a.col2.y*n.y;a=j.bodyA.m_xf.R;n=j.localPoint;c=j.bodyA.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);g=j.bodyA.m_xf.position.y+(a.col1.y*n.x+a.col2.y*n.y);a=j.bodyB.m_xf.R;for(o=0;o<j.pointCount;++o){n=j.points[o].localPoint;q=j.bodyB.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);n=j.bodyB.m_xf.position.y+(a.col1.y*n.x+a.col2.y*n.y);this.m_separations[o]=(q-c)*this.m_normal.x+(n-g)*this.m_normal.y-j.radius;this.m_points[o].x=q;this.m_points[o].y=
n}break;case Z.e_faceB:a=j.bodyB.m_xf.R;n=j.localPlaneNormal;this.m_normal.x=a.col1.x*n.x+a.col2.x*n.y;this.m_normal.y=a.col1.y*n.x+a.col2.y*n.y;a=j.bodyB.m_xf.R;n=j.localPoint;c=j.bodyB.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);g=j.bodyB.m_xf.position.y+(a.col1.y*n.x+a.col2.y*n.y);a=j.bodyA.m_xf.R;for(o=0;o<j.pointCount;++o){n=j.points[o].localPoint;q=j.bodyA.m_xf.position.x+(a.col1.x*n.x+a.col2.x*n.y);n=j.bodyA.m_xf.position.y+(a.col1.y*n.x+a.col2.y*n.y);this.m_separations[o]=(q-c)*this.m_normal.x+
(n-g)*this.m_normal.y-j.radius;this.m_points[o].Set(q,n)}this.m_normal.x*=-1;this.m_normal.y*=-1}};Box2D.postDefs.push(function(){Box2D.Dynamics.Contacts.b2PositionSolverManifold.circlePointA=new N;Box2D.Dynamics.Contacts.b2PositionSolverManifold.circlePointB=new N})})();
(function(){var F=Box2D.Common.Math.b2Mat22,G=Box2D.Common.Math.b2Math,K=Box2D.Common.Math.b2Vec2,y=Box2D.Common.b2Color,w=Box2D.Dynamics.Controllers.b2BuoyancyController,A=Box2D.Dynamics.Controllers.b2ConstantAccelController,U=Box2D.Dynamics.Controllers.b2ConstantForceController,p=Box2D.Dynamics.Controllers.b2Controller,B=Box2D.Dynamics.Controllers.b2ControllerEdge,Q=Box2D.Dynamics.Controllers.b2GravityController,V=Box2D.Dynamics.Controllers.b2TensorDampingController;Box2D.inherit(w,Box2D.Dynamics.Controllers.b2Controller);
w.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;w.b2BuoyancyController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.normal=new K(0,-1);this.density=this.offset=0;this.velocity=new K(0,0);this.linearDrag=2;this.angularDrag=1;this.useDensity=false;this.useWorldGravity=true;this.gravity=null};w.prototype.Step=function(){if(this.m_bodyList){if(this.useWorldGravity)this.gravity=this.GetWorld().GetGravity().Copy();for(var M=this.m_bodyList;M;M=
M.nextBody){var L=M.body;if(L.IsAwake()!=false){for(var I=new K,W=new K,Y=0,k=0,z=L.GetFixtureList();z;z=z.GetNext()){var u=new K,D=z.GetShape().ComputeSubmergedArea(this.normal,this.offset,L.GetTransform(),u);Y+=D;I.x+=D*u.x;I.y+=D*u.y;var H=0;H=1;k+=D*H;W.x+=D*u.x*H;W.y+=D*u.y*H}I.x/=Y;I.y/=Y;W.x/=k;W.y/=k;if(!(Y<Number.MIN_VALUE)){k=this.gravity.GetNegative();k.Multiply(this.density*Y);L.ApplyForce(k,W);W=L.GetLinearVelocityFromWorldPoint(I);W.Subtract(this.velocity);W.Multiply(-this.linearDrag*
Y);L.ApplyForce(W,I);L.ApplyTorque(-L.GetInertia()/L.GetMass()*Y*L.GetAngularVelocity()*this.angularDrag)}}}}};w.prototype.Draw=function(M){var L=new K,I=new K;L.x=this.normal.x*this.offset+this.normal.y*1E3;L.y=this.normal.y*this.offset-this.normal.x*1E3;I.x=this.normal.x*this.offset-this.normal.y*1E3;I.y=this.normal.y*this.offset+this.normal.x*1E3;var W=new y(0,0,1);M.DrawSegment(L,I,W)};Box2D.inherit(A,Box2D.Dynamics.Controllers.b2Controller);A.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;
A.b2ConstantAccelController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.A=new K(0,0)};A.prototype.Step=function(M){M=new K(this.A.x*M.dt,this.A.y*M.dt);for(var L=this.m_bodyList;L;L=L.nextBody){var I=L.body;I.IsAwake()&&I.SetLinearVelocity(new K(I.GetLinearVelocity().x+M.x,I.GetLinearVelocity().y+M.y))}};Box2D.inherit(U,Box2D.Dynamics.Controllers.b2Controller);U.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;U.b2ConstantForceController=
function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.F=new K(0,0)};U.prototype.Step=function(){for(var M=this.m_bodyList;M;M=M.nextBody){var L=M.body;L.IsAwake()&&L.ApplyForce(this.F,L.GetWorldCenter())}};p.b2Controller=function(){};p.prototype.Step=function(){};p.prototype.Draw=function(){};p.prototype.AddBody=function(M){var L=new B;L.controller=this;L.body=M;L.nextBody=this.m_bodyList;L.prevBody=null;this.m_bodyList=L;if(L.nextBody)L.nextBody.prevBody=L;this.m_bodyCount++;
L.nextController=M.m_controllerList;L.prevController=null;M.m_controllerList=L;if(L.nextController)L.nextController.prevController=L;M.m_controllerCount++};p.prototype.RemoveBody=function(M){for(var L=M.m_controllerList;L&&L.controller!=this;)L=L.nextController;if(L.prevBody)L.prevBody.nextBody=L.nextBody;if(L.nextBody)L.nextBody.prevBody=L.prevBody;if(L.nextController)L.nextController.prevController=L.prevController;if(L.prevController)L.prevController.nextController=L.nextController;if(this.m_bodyList==
L)this.m_bodyList=L.nextBody;if(M.m_controllerList==L)M.m_controllerList=L.nextController;M.m_controllerCount--;this.m_bodyCount--};p.prototype.Clear=function(){for(;this.m_bodyList;)this.RemoveBody(this.m_bodyList.body)};p.prototype.GetNext=function(){return this.m_next};p.prototype.GetWorld=function(){return this.m_world};p.prototype.GetBodyList=function(){return this.m_bodyList};B.b2ControllerEdge=function(){};Box2D.inherit(Q,Box2D.Dynamics.Controllers.b2Controller);Q.prototype.__super=Box2D.Dynamics.Controllers.b2Controller.prototype;
Q.b2GravityController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.G=1;this.invSqr=true};Q.prototype.Step=function(){var M=null,L=null,I=null,W=0,Y=null,k=null,z=null,u=0,D=0,H=0;u=null;if(this.invSqr)for(M=this.m_bodyList;M;M=M.nextBody){L=M.body;I=L.GetWorldCenter();W=L.GetMass();for(Y=this.m_bodyList;Y!=M;Y=Y.nextBody){k=Y.body;z=k.GetWorldCenter();u=z.x-I.x;D=z.y-I.y;H=u*u+D*D;if(!(H<Number.MIN_VALUE)){u=new K(u,D);u.Multiply(this.G/H/Math.sqrt(H)*
W*k.GetMass());L.IsAwake()&&L.ApplyForce(u,I);u.Multiply(-1);k.IsAwake()&&k.ApplyForce(u,z)}}}else for(M=this.m_bodyList;M;M=M.nextBody){L=M.body;I=L.GetWorldCenter();W=L.GetMass();for(Y=this.m_bodyList;Y!=M;Y=Y.nextBody){k=Y.body;z=k.GetWorldCenter();u=z.x-I.x;D=z.y-I.y;H=u*u+D*D;if(!(H<Number.MIN_VALUE)){u=new K(u,D);u.Multiply(this.G/H*W*k.GetMass());L.IsAwake()&&L.ApplyForce(u,I);u.Multiply(-1);k.IsAwake()&&k.ApplyForce(u,z)}}}};Box2D.inherit(V,Box2D.Dynamics.Controllers.b2Controller);V.prototype.__super=
Box2D.Dynamics.Controllers.b2Controller.prototype;V.b2TensorDampingController=function(){Box2D.Dynamics.Controllers.b2Controller.b2Controller.apply(this,arguments);this.T=new F;this.maxTimestep=0};V.prototype.SetAxisAligned=function(M,L){if(M===undefined)M=0;if(L===undefined)L=0;this.T.col1.x=-M;this.T.col1.y=0;this.T.col2.x=0;this.T.col2.y=-L;this.maxTimestep=M>0||L>0?1/Math.max(M,L):0};V.prototype.Step=function(M){M=M.dt;if(!(M<=Number.MIN_VALUE)){if(M>this.maxTimestep&&this.maxTimestep>0)M=this.maxTimestep;
for(var L=this.m_bodyList;L;L=L.nextBody){var I=L.body;if(I.IsAwake()){var W=I.GetWorldVector(G.MulMV(this.T,I.GetLocalVector(I.GetLinearVelocity())));I.SetLinearVelocity(new K(I.GetLinearVelocity().x+W.x*M,I.GetLinearVelocity().y+W.y*M))}}}}})();
(function(){var F=Box2D.Common.b2Settings,G=Box2D.Common.Math.b2Mat22,K=Box2D.Common.Math.b2Mat33,y=Box2D.Common.Math.b2Math,w=Box2D.Common.Math.b2Vec2,A=Box2D.Common.Math.b2Vec3,U=Box2D.Dynamics.Joints.b2DistanceJoint,p=Box2D.Dynamics.Joints.b2DistanceJointDef,B=Box2D.Dynamics.Joints.b2FrictionJoint,Q=Box2D.Dynamics.Joints.b2FrictionJointDef,V=Box2D.Dynamics.Joints.b2GearJoint,M=Box2D.Dynamics.Joints.b2GearJointDef,L=Box2D.Dynamics.Joints.b2Jacobian,I=Box2D.Dynamics.Joints.b2Joint,W=Box2D.Dynamics.Joints.b2JointDef,
Y=Box2D.Dynamics.Joints.b2JointEdge,k=Box2D.Dynamics.Joints.b2LineJoint,z=Box2D.Dynamics.Joints.b2LineJointDef,u=Box2D.Dynamics.Joints.b2MouseJoint,D=Box2D.Dynamics.Joints.b2MouseJointDef,H=Box2D.Dynamics.Joints.b2PrismaticJoint,O=Box2D.Dynamics.Joints.b2PrismaticJointDef,E=Box2D.Dynamics.Joints.b2PulleyJoint,R=Box2D.Dynamics.Joints.b2PulleyJointDef,N=Box2D.Dynamics.Joints.b2RevoluteJoint,S=Box2D.Dynamics.Joints.b2RevoluteJointDef,aa=Box2D.Dynamics.Joints.b2WeldJoint,Z=Box2D.Dynamics.Joints.b2WeldJointDef;
Box2D.inherit(U,Box2D.Dynamics.Joints.b2Joint);U.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;U.b2DistanceJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_u=new w};U.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};U.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};U.prototype.GetReactionForce=function(d){if(d===undefined)d=
0;return new w(d*this.m_impulse*this.m_u.x,d*this.m_impulse*this.m_u.y)};U.prototype.GetReactionTorque=function(){return 0};U.prototype.GetLength=function(){return this.m_length};U.prototype.SetLength=function(d){if(d===undefined)d=0;this.m_length=d};U.prototype.GetFrequency=function(){return this.m_frequencyHz};U.prototype.SetFrequency=function(d){if(d===undefined)d=0;this.m_frequencyHz=d};U.prototype.GetDampingRatio=function(){return this.m_dampingRatio};U.prototype.SetDampingRatio=function(d){if(d===
undefined)d=0;this.m_dampingRatio=d};U.prototype.b2DistanceJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchor1.SetV(d.localAnchorA);this.m_localAnchor2.SetV(d.localAnchorB);this.m_length=d.length;this.m_frequencyHz=d.frequencyHz;this.m_dampingRatio=d.dampingRatio;this.m_bias=this.m_gamma=this.m_impulse=0};U.prototype.InitVelocityConstraints=function(d){var h,l=0,j=this.m_bodyA,o=this.m_bodyB;h=j.m_xf.R;var q=this.m_localAnchor1.x-j.m_sweep.localCenter.x,n=this.m_localAnchor1.y-
j.m_sweep.localCenter.y;l=h.col1.x*q+h.col2.x*n;n=h.col1.y*q+h.col2.y*n;q=l;h=o.m_xf.R;var a=this.m_localAnchor2.x-o.m_sweep.localCenter.x,c=this.m_localAnchor2.y-o.m_sweep.localCenter.y;l=h.col1.x*a+h.col2.x*c;c=h.col1.y*a+h.col2.y*c;a=l;this.m_u.x=o.m_sweep.c.x+a-j.m_sweep.c.x-q;this.m_u.y=o.m_sweep.c.y+c-j.m_sweep.c.y-n;l=Math.sqrt(this.m_u.x*this.m_u.x+this.m_u.y*this.m_u.y);l>F.b2_linearSlop?this.m_u.Multiply(1/l):this.m_u.SetZero();h=q*this.m_u.y-n*this.m_u.x;var g=a*this.m_u.y-c*this.m_u.x;
h=j.m_invMass+j.m_invI*h*h+o.m_invMass+o.m_invI*g*g;this.m_mass=h!=0?1/h:0;if(this.m_frequencyHz>0){l=l-this.m_length;g=2*Math.PI*this.m_frequencyHz;var b=this.m_mass*g*g;this.m_gamma=d.dt*(2*this.m_mass*this.m_dampingRatio*g+d.dt*b);this.m_gamma=this.m_gamma!=0?1/this.m_gamma:0;this.m_bias=l*d.dt*b*this.m_gamma;this.m_mass=h+this.m_gamma;this.m_mass=this.m_mass!=0?1/this.m_mass:0}if(d.warmStarting){this.m_impulse*=d.dtRatio;d=this.m_impulse*this.m_u.x;h=this.m_impulse*this.m_u.y;j.m_linearVelocity.x-=
j.m_invMass*d;j.m_linearVelocity.y-=j.m_invMass*h;j.m_angularVelocity-=j.m_invI*(q*h-n*d);o.m_linearVelocity.x+=o.m_invMass*d;o.m_linearVelocity.y+=o.m_invMass*h;o.m_angularVelocity+=o.m_invI*(a*h-c*d)}else this.m_impulse=0};U.prototype.SolveVelocityConstraints=function(){var d,h=this.m_bodyA,l=this.m_bodyB;d=h.m_xf.R;var j=this.m_localAnchor1.x-h.m_sweep.localCenter.x,o=this.m_localAnchor1.y-h.m_sweep.localCenter.y,q=d.col1.x*j+d.col2.x*o;o=d.col1.y*j+d.col2.y*o;j=q;d=l.m_xf.R;var n=this.m_localAnchor2.x-
l.m_sweep.localCenter.x,a=this.m_localAnchor2.y-l.m_sweep.localCenter.y;q=d.col1.x*n+d.col2.x*a;a=d.col1.y*n+d.col2.y*a;n=q;q=-this.m_mass*(this.m_u.x*(l.m_linearVelocity.x+-l.m_angularVelocity*a-(h.m_linearVelocity.x+-h.m_angularVelocity*o))+this.m_u.y*(l.m_linearVelocity.y+l.m_angularVelocity*n-(h.m_linearVelocity.y+h.m_angularVelocity*j))+this.m_bias+this.m_gamma*this.m_impulse);this.m_impulse+=q;d=q*this.m_u.x;q=q*this.m_u.y;h.m_linearVelocity.x-=h.m_invMass*d;h.m_linearVelocity.y-=h.m_invMass*
q;h.m_angularVelocity-=h.m_invI*(j*q-o*d);l.m_linearVelocity.x+=l.m_invMass*d;l.m_linearVelocity.y+=l.m_invMass*q;l.m_angularVelocity+=l.m_invI*(n*q-a*d)};U.prototype.SolvePositionConstraints=function(){var d;if(this.m_frequencyHz>0)return true;var h=this.m_bodyA,l=this.m_bodyB;d=h.m_xf.R;var j=this.m_localAnchor1.x-h.m_sweep.localCenter.x,o=this.m_localAnchor1.y-h.m_sweep.localCenter.y,q=d.col1.x*j+d.col2.x*o;o=d.col1.y*j+d.col2.y*o;j=q;d=l.m_xf.R;var n=this.m_localAnchor2.x-l.m_sweep.localCenter.x,
a=this.m_localAnchor2.y-l.m_sweep.localCenter.y;q=d.col1.x*n+d.col2.x*a;a=d.col1.y*n+d.col2.y*a;n=q;q=l.m_sweep.c.x+n-h.m_sweep.c.x-j;var c=l.m_sweep.c.y+a-h.m_sweep.c.y-o;d=Math.sqrt(q*q+c*c);q/=d;c/=d;d=d-this.m_length;d=y.Clamp(d,-F.b2_maxLinearCorrection,F.b2_maxLinearCorrection);var g=-this.m_mass*d;this.m_u.Set(q,c);q=g*this.m_u.x;c=g*this.m_u.y;h.m_sweep.c.x-=h.m_invMass*q;h.m_sweep.c.y-=h.m_invMass*c;h.m_sweep.a-=h.m_invI*(j*c-o*q);l.m_sweep.c.x+=l.m_invMass*q;l.m_sweep.c.y+=l.m_invMass*c;
l.m_sweep.a+=l.m_invI*(n*c-a*q);h.SynchronizeTransform();l.SynchronizeTransform();return y.Abs(d)<F.b2_linearSlop};Box2D.inherit(p,Box2D.Dynamics.Joints.b2JointDef);p.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;p.b2DistanceJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new w;this.localAnchorB=new w};p.prototype.b2DistanceJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_distanceJoint;this.length=1;this.dampingRatio=
this.frequencyHz=0};p.prototype.Initialize=function(d,h,l,j){this.bodyA=d;this.bodyB=h;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(l));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(j));d=j.x-l.x;l=j.y-l.y;this.length=Math.sqrt(d*d+l*l);this.dampingRatio=this.frequencyHz=0};Box2D.inherit(B,Box2D.Dynamics.Joints.b2Joint);B.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;B.b2FrictionJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchorA=new w;
this.m_localAnchorB=new w;this.m_linearMass=new G;this.m_linearImpulse=new w};B.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchorA)};B.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchorB)};B.prototype.GetReactionForce=function(d){if(d===undefined)d=0;return new w(d*this.m_linearImpulse.x,d*this.m_linearImpulse.y)};B.prototype.GetReactionTorque=function(d){if(d===undefined)d=0;return d*this.m_angularImpulse};B.prototype.SetMaxForce=
function(d){if(d===undefined)d=0;this.m_maxForce=d};B.prototype.GetMaxForce=function(){return this.m_maxForce};B.prototype.SetMaxTorque=function(d){if(d===undefined)d=0;this.m_maxTorque=d};B.prototype.GetMaxTorque=function(){return this.m_maxTorque};B.prototype.b2FrictionJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchorA.SetV(d.localAnchorA);this.m_localAnchorB.SetV(d.localAnchorB);this.m_linearMass.SetZero();this.m_angularMass=0;this.m_linearImpulse.SetZero();this.m_angularImpulse=
0;this.m_maxForce=d.maxForce;this.m_maxTorque=d.maxTorque};B.prototype.InitVelocityConstraints=function(d){var h,l=0,j=this.m_bodyA,o=this.m_bodyB;h=j.m_xf.R;var q=this.m_localAnchorA.x-j.m_sweep.localCenter.x,n=this.m_localAnchorA.y-j.m_sweep.localCenter.y;l=h.col1.x*q+h.col2.x*n;n=h.col1.y*q+h.col2.y*n;q=l;h=o.m_xf.R;var a=this.m_localAnchorB.x-o.m_sweep.localCenter.x,c=this.m_localAnchorB.y-o.m_sweep.localCenter.y;l=h.col1.x*a+h.col2.x*c;c=h.col1.y*a+h.col2.y*c;a=l;h=j.m_invMass;l=o.m_invMass;
var g=j.m_invI,b=o.m_invI,e=new G;e.col1.x=h+l;e.col2.x=0;e.col1.y=0;e.col2.y=h+l;e.col1.x+=g*n*n;e.col2.x+=-g*q*n;e.col1.y+=-g*q*n;e.col2.y+=g*q*q;e.col1.x+=b*c*c;e.col2.x+=-b*a*c;e.col1.y+=-b*a*c;e.col2.y+=b*a*a;e.GetInverse(this.m_linearMass);this.m_angularMass=g+b;if(this.m_angularMass>0)this.m_angularMass=1/this.m_angularMass;if(d.warmStarting){this.m_linearImpulse.x*=d.dtRatio;this.m_linearImpulse.y*=d.dtRatio;this.m_angularImpulse*=d.dtRatio;d=this.m_linearImpulse;j.m_linearVelocity.x-=h*d.x;
j.m_linearVelocity.y-=h*d.y;j.m_angularVelocity-=g*(q*d.y-n*d.x+this.m_angularImpulse);o.m_linearVelocity.x+=l*d.x;o.m_linearVelocity.y+=l*d.y;o.m_angularVelocity+=b*(a*d.y-c*d.x+this.m_angularImpulse)}else{this.m_linearImpulse.SetZero();this.m_angularImpulse=0}};B.prototype.SolveVelocityConstraints=function(d){var h,l=0,j=this.m_bodyA,o=this.m_bodyB,q=j.m_linearVelocity,n=j.m_angularVelocity,a=o.m_linearVelocity,c=o.m_angularVelocity,g=j.m_invMass,b=o.m_invMass,e=j.m_invI,f=o.m_invI;h=j.m_xf.R;var m=
this.m_localAnchorA.x-j.m_sweep.localCenter.x,r=this.m_localAnchorA.y-j.m_sweep.localCenter.y;l=h.col1.x*m+h.col2.x*r;r=h.col1.y*m+h.col2.y*r;m=l;h=o.m_xf.R;var s=this.m_localAnchorB.x-o.m_sweep.localCenter.x,v=this.m_localAnchorB.y-o.m_sweep.localCenter.y;l=h.col1.x*s+h.col2.x*v;v=h.col1.y*s+h.col2.y*v;s=l;h=0;l=-this.m_angularMass*(c-n);var t=this.m_angularImpulse;h=d.dt*this.m_maxTorque;this.m_angularImpulse=y.Clamp(this.m_angularImpulse+l,-h,h);l=this.m_angularImpulse-t;n-=e*l;c+=f*l;h=y.MulMV(this.m_linearMass,
new w(-(a.x-c*v-q.x+n*r),-(a.y+c*s-q.y-n*m)));l=this.m_linearImpulse.Copy();this.m_linearImpulse.Add(h);h=d.dt*this.m_maxForce;if(this.m_linearImpulse.LengthSquared()>h*h){this.m_linearImpulse.Normalize();this.m_linearImpulse.Multiply(h)}h=y.SubtractVV(this.m_linearImpulse,l);q.x-=g*h.x;q.y-=g*h.y;n-=e*(m*h.y-r*h.x);a.x+=b*h.x;a.y+=b*h.y;c+=f*(s*h.y-v*h.x);j.m_angularVelocity=n;o.m_angularVelocity=c};B.prototype.SolvePositionConstraints=function(){return true};Box2D.inherit(Q,Box2D.Dynamics.Joints.b2JointDef);
Q.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;Q.b2FrictionJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new w;this.localAnchorB=new w};Q.prototype.b2FrictionJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_frictionJoint;this.maxTorque=this.maxForce=0};Q.prototype.Initialize=function(d,h,l){this.bodyA=d;this.bodyB=h;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(l));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(l))};
Box2D.inherit(V,Box2D.Dynamics.Joints.b2Joint);V.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;V.b2GearJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_groundAnchor1=new w;this.m_groundAnchor2=new w;this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_J=new L};V.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};V.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};V.prototype.GetReactionForce=
function(d){if(d===undefined)d=0;return new w(d*this.m_impulse*this.m_J.linearB.x,d*this.m_impulse*this.m_J.linearB.y)};V.prototype.GetReactionTorque=function(d){if(d===undefined)d=0;var h=this.m_bodyB.m_xf.R,l=this.m_localAnchor1.x-this.m_bodyB.m_sweep.localCenter.x,j=this.m_localAnchor1.y-this.m_bodyB.m_sweep.localCenter.y,o=h.col1.x*l+h.col2.x*j;j=h.col1.y*l+h.col2.y*j;l=o;return d*(this.m_impulse*this.m_J.angularB-l*this.m_impulse*this.m_J.linearB.y+j*this.m_impulse*this.m_J.linearB.x)};V.prototype.GetRatio=
function(){return this.m_ratio};V.prototype.SetRatio=function(d){if(d===undefined)d=0;this.m_ratio=d};V.prototype.b2GearJoint=function(d){this.__super.b2Joint.call(this,d);var h=parseInt(d.joint1.m_type),l=parseInt(d.joint2.m_type);this.m_prismatic2=this.m_revolute2=this.m_prismatic1=this.m_revolute1=null;var j=0,o=0;this.m_ground1=d.joint1.GetBodyA();this.m_bodyA=d.joint1.GetBodyB();if(h==I.e_revoluteJoint){this.m_revolute1=d.joint1 instanceof N?d.joint1:null;this.m_groundAnchor1.SetV(this.m_revolute1.m_localAnchor1);
this.m_localAnchor1.SetV(this.m_revolute1.m_localAnchor2);j=this.m_revolute1.GetJointAngle()}else{this.m_prismatic1=d.joint1 instanceof H?d.joint1:null;this.m_groundAnchor1.SetV(this.m_prismatic1.m_localAnchor1);this.m_localAnchor1.SetV(this.m_prismatic1.m_localAnchor2);j=this.m_prismatic1.GetJointTranslation()}this.m_ground2=d.joint2.GetBodyA();this.m_bodyB=d.joint2.GetBodyB();if(l==I.e_revoluteJoint){this.m_revolute2=d.joint2 instanceof N?d.joint2:null;this.m_groundAnchor2.SetV(this.m_revolute2.m_localAnchor1);
this.m_localAnchor2.SetV(this.m_revolute2.m_localAnchor2);o=this.m_revolute2.GetJointAngle()}else{this.m_prismatic2=d.joint2 instanceof H?d.joint2:null;this.m_groundAnchor2.SetV(this.m_prismatic2.m_localAnchor1);this.m_localAnchor2.SetV(this.m_prismatic2.m_localAnchor2);o=this.m_prismatic2.GetJointTranslation()}this.m_ratio=d.ratio;this.m_constant=j+this.m_ratio*o;this.m_impulse=0};V.prototype.InitVelocityConstraints=function(d){var h=this.m_ground1,l=this.m_ground2,j=this.m_bodyA,o=this.m_bodyB,
q=0,n=0,a=0,c=0,g=a=0,b=0;this.m_J.SetZero();if(this.m_revolute1){this.m_J.angularA=-1;b+=j.m_invI}else{h=h.m_xf.R;n=this.m_prismatic1.m_localXAxis1;q=h.col1.x*n.x+h.col2.x*n.y;n=h.col1.y*n.x+h.col2.y*n.y;h=j.m_xf.R;a=this.m_localAnchor1.x-j.m_sweep.localCenter.x;c=this.m_localAnchor1.y-j.m_sweep.localCenter.y;g=h.col1.x*a+h.col2.x*c;c=h.col1.y*a+h.col2.y*c;a=g;a=a*n-c*q;this.m_J.linearA.Set(-q,-n);this.m_J.angularA=-a;b+=j.m_invMass+j.m_invI*a*a}if(this.m_revolute2){this.m_J.angularB=-this.m_ratio;
b+=this.m_ratio*this.m_ratio*o.m_invI}else{h=l.m_xf.R;n=this.m_prismatic2.m_localXAxis1;q=h.col1.x*n.x+h.col2.x*n.y;n=h.col1.y*n.x+h.col2.y*n.y;h=o.m_xf.R;a=this.m_localAnchor2.x-o.m_sweep.localCenter.x;c=this.m_localAnchor2.y-o.m_sweep.localCenter.y;g=h.col1.x*a+h.col2.x*c;c=h.col1.y*a+h.col2.y*c;a=g;a=a*n-c*q;this.m_J.linearB.Set(-this.m_ratio*q,-this.m_ratio*n);this.m_J.angularB=-this.m_ratio*a;b+=this.m_ratio*this.m_ratio*(o.m_invMass+o.m_invI*a*a)}this.m_mass=b>0?1/b:0;if(d.warmStarting){j.m_linearVelocity.x+=
j.m_invMass*this.m_impulse*this.m_J.linearA.x;j.m_linearVelocity.y+=j.m_invMass*this.m_impulse*this.m_J.linearA.y;j.m_angularVelocity+=j.m_invI*this.m_impulse*this.m_J.angularA;o.m_linearVelocity.x+=o.m_invMass*this.m_impulse*this.m_J.linearB.x;o.m_linearVelocity.y+=o.m_invMass*this.m_impulse*this.m_J.linearB.y;o.m_angularVelocity+=o.m_invI*this.m_impulse*this.m_J.angularB}else this.m_impulse=0};V.prototype.SolveVelocityConstraints=function(){var d=this.m_bodyA,h=this.m_bodyB,l=-this.m_mass*this.m_J.Compute(d.m_linearVelocity,
d.m_angularVelocity,h.m_linearVelocity,h.m_angularVelocity);this.m_impulse+=l;d.m_linearVelocity.x+=d.m_invMass*l*this.m_J.linearA.x;d.m_linearVelocity.y+=d.m_invMass*l*this.m_J.linearA.y;d.m_angularVelocity+=d.m_invI*l*this.m_J.angularA;h.m_linearVelocity.x+=h.m_invMass*l*this.m_J.linearB.x;h.m_linearVelocity.y+=h.m_invMass*l*this.m_J.linearB.y;h.m_angularVelocity+=h.m_invI*l*this.m_J.angularB};V.prototype.SolvePositionConstraints=function(){var d=this.m_bodyA,h=this.m_bodyB,l=0,j=0;l=this.m_revolute1?
this.m_revolute1.GetJointAngle():this.m_prismatic1.GetJointTranslation();j=this.m_revolute2?this.m_revolute2.GetJointAngle():this.m_prismatic2.GetJointTranslation();l=-this.m_mass*(this.m_constant-(l+this.m_ratio*j));d.m_sweep.c.x+=d.m_invMass*l*this.m_J.linearA.x;d.m_sweep.c.y+=d.m_invMass*l*this.m_J.linearA.y;d.m_sweep.a+=d.m_invI*l*this.m_J.angularA;h.m_sweep.c.x+=h.m_invMass*l*this.m_J.linearB.x;h.m_sweep.c.y+=h.m_invMass*l*this.m_J.linearB.y;h.m_sweep.a+=h.m_invI*l*this.m_J.angularB;d.SynchronizeTransform();
h.SynchronizeTransform();return 0<F.b2_linearSlop};Box2D.inherit(M,Box2D.Dynamics.Joints.b2JointDef);M.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;M.b2GearJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments)};M.prototype.b2GearJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_gearJoint;this.joint2=this.joint1=null;this.ratio=1};L.b2Jacobian=function(){this.linearA=new w;this.linearB=new w};L.prototype.SetZero=function(){this.linearA.SetZero();
this.angularA=0;this.linearB.SetZero();this.angularB=0};L.prototype.Set=function(d,h,l,j){if(h===undefined)h=0;if(j===undefined)j=0;this.linearA.SetV(d);this.angularA=h;this.linearB.SetV(l);this.angularB=j};L.prototype.Compute=function(d,h,l,j){if(h===undefined)h=0;if(j===undefined)j=0;return this.linearA.x*d.x+this.linearA.y*d.y+this.angularA*h+(this.linearB.x*l.x+this.linearB.y*l.y)+this.angularB*j};I.b2Joint=function(){this.m_edgeA=new Y;this.m_edgeB=new Y;this.m_localCenterA=new w;this.m_localCenterB=
new w};I.prototype.GetType=function(){return this.m_type};I.prototype.GetAnchorA=function(){return null};I.prototype.GetAnchorB=function(){return null};I.prototype.GetReactionForce=function(){return null};I.prototype.GetReactionTorque=function(){return 0};I.prototype.GetBodyA=function(){return this.m_bodyA};I.prototype.GetBodyB=function(){return this.m_bodyB};I.prototype.GetNext=function(){return this.m_next};I.prototype.GetUserData=function(){return this.m_userData};I.prototype.SetUserData=function(d){this.m_userData=
d};I.prototype.IsActive=function(){return this.m_bodyA.IsActive()&&this.m_bodyB.IsActive()};I.Create=function(d){var h=null;switch(d.type){case I.e_distanceJoint:h=new U(d instanceof p?d:null);break;case I.e_mouseJoint:h=new u(d instanceof D?d:null);break;case I.e_prismaticJoint:h=new H(d instanceof O?d:null);break;case I.e_revoluteJoint:h=new N(d instanceof S?d:null);break;case I.e_pulleyJoint:h=new E(d instanceof R?d:null);break;case I.e_gearJoint:h=new V(d instanceof M?d:null);break;case I.e_lineJoint:h=
new k(d instanceof z?d:null);break;case I.e_weldJoint:h=new aa(d instanceof Z?d:null);break;case I.e_frictionJoint:h=new B(d instanceof Q?d:null)}return h};I.Destroy=function(){};I.prototype.b2Joint=function(d){F.b2Assert(d.bodyA!=d.bodyB);this.m_type=d.type;this.m_next=this.m_prev=null;this.m_bodyA=d.bodyA;this.m_bodyB=d.bodyB;this.m_collideConnected=d.collideConnected;this.m_islandFlag=false;this.m_userData=d.userData};I.prototype.InitVelocityConstraints=function(){};I.prototype.SolveVelocityConstraints=
function(){};I.prototype.FinalizeVelocityConstraints=function(){};I.prototype.SolvePositionConstraints=function(){return false};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2Joint.e_unknownJoint=0;Box2D.Dynamics.Joints.b2Joint.e_revoluteJoint=1;Box2D.Dynamics.Joints.b2Joint.e_prismaticJoint=2;Box2D.Dynamics.Joints.b2Joint.e_distanceJoint=3;Box2D.Dynamics.Joints.b2Joint.e_pulleyJoint=4;Box2D.Dynamics.Joints.b2Joint.e_mouseJoint=5;Box2D.Dynamics.Joints.b2Joint.e_gearJoint=6;Box2D.Dynamics.Joints.b2Joint.e_lineJoint=
7;Box2D.Dynamics.Joints.b2Joint.e_weldJoint=8;Box2D.Dynamics.Joints.b2Joint.e_frictionJoint=9;Box2D.Dynamics.Joints.b2Joint.e_inactiveLimit=0;Box2D.Dynamics.Joints.b2Joint.e_atLowerLimit=1;Box2D.Dynamics.Joints.b2Joint.e_atUpperLimit=2;Box2D.Dynamics.Joints.b2Joint.e_equalLimits=3});W.b2JointDef=function(){};W.prototype.b2JointDef=function(){this.type=I.e_unknownJoint;this.bodyB=this.bodyA=this.userData=null;this.collideConnected=false};Y.b2JointEdge=function(){};Box2D.inherit(k,Box2D.Dynamics.Joints.b2Joint);
k.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;k.b2LineJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_localXAxis1=new w;this.m_localYAxis1=new w;this.m_axis=new w;this.m_perp=new w;this.m_K=new G;this.m_impulse=new w};k.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};k.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};k.prototype.GetReactionForce=
function(d){if(d===undefined)d=0;return new w(d*(this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.x),d*(this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.y))};k.prototype.GetReactionTorque=function(d){if(d===undefined)d=0;return d*this.m_impulse.y};k.prototype.GetJointTranslation=function(){var d=this.m_bodyA,h=this.m_bodyB,l=d.GetWorldPoint(this.m_localAnchor1),j=h.GetWorldPoint(this.m_localAnchor2);h=j.x-l.x;l=j.y-l.y;d=d.GetWorldVector(this.m_localXAxis1);
return d.x*h+d.y*l};k.prototype.GetJointSpeed=function(){var d=this.m_bodyA,h=this.m_bodyB,l;l=d.m_xf.R;var j=this.m_localAnchor1.x-d.m_sweep.localCenter.x,o=this.m_localAnchor1.y-d.m_sweep.localCenter.y,q=l.col1.x*j+l.col2.x*o;o=l.col1.y*j+l.col2.y*o;j=q;l=h.m_xf.R;var n=this.m_localAnchor2.x-h.m_sweep.localCenter.x,a=this.m_localAnchor2.y-h.m_sweep.localCenter.y;q=l.col1.x*n+l.col2.x*a;a=l.col1.y*n+l.col2.y*a;n=q;l=h.m_sweep.c.x+n-(d.m_sweep.c.x+j);q=h.m_sweep.c.y+a-(d.m_sweep.c.y+o);var c=d.GetWorldVector(this.m_localXAxis1),
g=d.m_linearVelocity,b=h.m_linearVelocity;d=d.m_angularVelocity;h=h.m_angularVelocity;return l*-d*c.y+q*d*c.x+(c.x*(b.x+-h*a-g.x- -d*o)+c.y*(b.y+h*n-g.y-d*j))};k.prototype.IsLimitEnabled=function(){return this.m_enableLimit};k.prototype.EnableLimit=function(d){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableLimit=d};k.prototype.GetLowerLimit=function(){return this.m_lowerTranslation};k.prototype.GetUpperLimit=function(){return this.m_upperTranslation};k.prototype.SetLimits=function(d,
h){if(d===undefined)d=0;if(h===undefined)h=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_lowerTranslation=d;this.m_upperTranslation=h};k.prototype.IsMotorEnabled=function(){return this.m_enableMotor};k.prototype.EnableMotor=function(d){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableMotor=d};k.prototype.SetMotorSpeed=function(d){if(d===undefined)d=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=d};k.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};
k.prototype.SetMaxMotorForce=function(d){if(d===undefined)d=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_maxMotorForce=d};k.prototype.GetMaxMotorForce=function(){return this.m_maxMotorForce};k.prototype.GetMotorForce=function(){return this.m_motorImpulse};k.prototype.b2LineJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchor1.SetV(d.localAnchorA);this.m_localAnchor2.SetV(d.localAnchorB);this.m_localXAxis1.SetV(d.localAxisA);this.m_localYAxis1.x=-this.m_localXAxis1.y;
this.m_localYAxis1.y=this.m_localXAxis1.x;this.m_impulse.SetZero();this.m_motorImpulse=this.m_motorMass=0;this.m_lowerTranslation=d.lowerTranslation;this.m_upperTranslation=d.upperTranslation;this.m_maxMotorForce=d.maxMotorForce;this.m_motorSpeed=d.motorSpeed;this.m_enableLimit=d.enableLimit;this.m_enableMotor=d.enableMotor;this.m_limitState=I.e_inactiveLimit;this.m_axis.SetZero();this.m_perp.SetZero()};k.prototype.InitVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j,o=0;this.m_localCenterA.SetV(h.GetLocalCenter());
this.m_localCenterB.SetV(l.GetLocalCenter());var q=h.GetTransform();l.GetTransform();j=h.m_xf.R;var n=this.m_localAnchor1.x-this.m_localCenterA.x,a=this.m_localAnchor1.y-this.m_localCenterA.y;o=j.col1.x*n+j.col2.x*a;a=j.col1.y*n+j.col2.y*a;n=o;j=l.m_xf.R;var c=this.m_localAnchor2.x-this.m_localCenterB.x,g=this.m_localAnchor2.y-this.m_localCenterB.y;o=j.col1.x*c+j.col2.x*g;g=j.col1.y*c+j.col2.y*g;c=o;j=l.m_sweep.c.x+c-h.m_sweep.c.x-n;o=l.m_sweep.c.y+g-h.m_sweep.c.y-a;this.m_invMassA=h.m_invMass;this.m_invMassB=
l.m_invMass;this.m_invIA=h.m_invI;this.m_invIB=l.m_invI;this.m_axis.SetV(y.MulMV(q.R,this.m_localXAxis1));this.m_a1=(j+n)*this.m_axis.y-(o+a)*this.m_axis.x;this.m_a2=c*this.m_axis.y-g*this.m_axis.x;this.m_motorMass=this.m_invMassA+this.m_invMassB+this.m_invIA*this.m_a1*this.m_a1+this.m_invIB*this.m_a2*this.m_a2;this.m_motorMass=this.m_motorMass>Number.MIN_VALUE?1/this.m_motorMass:0;this.m_perp.SetV(y.MulMV(q.R,this.m_localYAxis1));this.m_s1=(j+n)*this.m_perp.y-(o+a)*this.m_perp.x;this.m_s2=c*this.m_perp.y-
g*this.m_perp.x;q=this.m_invMassA;n=this.m_invMassB;a=this.m_invIA;c=this.m_invIB;this.m_K.col1.x=q+n+a*this.m_s1*this.m_s1+c*this.m_s2*this.m_s2;this.m_K.col1.y=a*this.m_s1*this.m_a1+c*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=q+n+a*this.m_a1*this.m_a1+c*this.m_a2*this.m_a2;if(this.m_enableLimit){j=this.m_axis.x*j+this.m_axis.y*o;if(y.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*F.b2_linearSlop)this.m_limitState=I.e_equalLimits;else if(j<=this.m_lowerTranslation){if(this.m_limitState!=
I.e_atLowerLimit){this.m_limitState=I.e_atLowerLimit;this.m_impulse.y=0}}else if(j>=this.m_upperTranslation){if(this.m_limitState!=I.e_atUpperLimit){this.m_limitState=I.e_atUpperLimit;this.m_impulse.y=0}}else{this.m_limitState=I.e_inactiveLimit;this.m_impulse.y=0}}else this.m_limitState=I.e_inactiveLimit;if(this.m_enableMotor==false)this.m_motorImpulse=0;if(d.warmStarting){this.m_impulse.x*=d.dtRatio;this.m_impulse.y*=d.dtRatio;this.m_motorImpulse*=d.dtRatio;d=this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+
this.m_impulse.y)*this.m_axis.x;j=this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.y)*this.m_axis.y;o=this.m_impulse.x*this.m_s1+(this.m_motorImpulse+this.m_impulse.y)*this.m_a1;q=this.m_impulse.x*this.m_s2+(this.m_motorImpulse+this.m_impulse.y)*this.m_a2;h.m_linearVelocity.x-=this.m_invMassA*d;h.m_linearVelocity.y-=this.m_invMassA*j;h.m_angularVelocity-=this.m_invIA*o;l.m_linearVelocity.x+=this.m_invMassB*d;l.m_linearVelocity.y+=this.m_invMassB*j;l.m_angularVelocity+=this.m_invIB*
q}else{this.m_impulse.SetZero();this.m_motorImpulse=0}};k.prototype.SolveVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j=h.m_linearVelocity,o=h.m_angularVelocity,q=l.m_linearVelocity,n=l.m_angularVelocity,a=0,c=0,g=0,b=0;if(this.m_enableMotor&&this.m_limitState!=I.e_equalLimits){b=this.m_motorMass*(this.m_motorSpeed-(this.m_axis.x*(q.x-j.x)+this.m_axis.y*(q.y-j.y)+this.m_a2*n-this.m_a1*o));a=this.m_motorImpulse;c=d.dt*this.m_maxMotorForce;this.m_motorImpulse=y.Clamp(this.m_motorImpulse+
b,-c,c);b=this.m_motorImpulse-a;a=b*this.m_axis.x;c=b*this.m_axis.y;g=b*this.m_a1;b=b*this.m_a2;j.x-=this.m_invMassA*a;j.y-=this.m_invMassA*c;o-=this.m_invIA*g;q.x+=this.m_invMassB*a;q.y+=this.m_invMassB*c;n+=this.m_invIB*b}c=this.m_perp.x*(q.x-j.x)+this.m_perp.y*(q.y-j.y)+this.m_s2*n-this.m_s1*o;if(this.m_enableLimit&&this.m_limitState!=I.e_inactiveLimit){g=this.m_axis.x*(q.x-j.x)+this.m_axis.y*(q.y-j.y)+this.m_a2*n-this.m_a1*o;a=this.m_impulse.Copy();d=this.m_K.Solve(new w,-c,-g);this.m_impulse.Add(d);
if(this.m_limitState==I.e_atLowerLimit)this.m_impulse.y=y.Max(this.m_impulse.y,0);else if(this.m_limitState==I.e_atUpperLimit)this.m_impulse.y=y.Min(this.m_impulse.y,0);c=-c-(this.m_impulse.y-a.y)*this.m_K.col2.x;g=0;g=this.m_K.col1.x!=0?c/this.m_K.col1.x+a.x:a.x;this.m_impulse.x=g;d.x=this.m_impulse.x-a.x;d.y=this.m_impulse.y-a.y;a=d.x*this.m_perp.x+d.y*this.m_axis.x;c=d.x*this.m_perp.y+d.y*this.m_axis.y;g=d.x*this.m_s1+d.y*this.m_a1;b=d.x*this.m_s2+d.y*this.m_a2}else{d=0;d=this.m_K.col1.x!=0?-c/
this.m_K.col1.x:0;this.m_impulse.x+=d;a=d*this.m_perp.x;c=d*this.m_perp.y;g=d*this.m_s1;b=d*this.m_s2}j.x-=this.m_invMassA*a;j.y-=this.m_invMassA*c;o-=this.m_invIA*g;q.x+=this.m_invMassB*a;q.y+=this.m_invMassB*c;n+=this.m_invIB*b;h.m_linearVelocity.SetV(j);h.m_angularVelocity=o;l.m_linearVelocity.SetV(q);l.m_angularVelocity=n};k.prototype.SolvePositionConstraints=function(){var d=this.m_bodyA,h=this.m_bodyB,l=d.m_sweep.c,j=d.m_sweep.a,o=h.m_sweep.c,q=h.m_sweep.a,n,a=0,c=0,g=0,b=0,e=n=0,f=0;c=false;
var m=0,r=G.FromAngle(j);g=G.FromAngle(q);n=r;f=this.m_localAnchor1.x-this.m_localCenterA.x;var s=this.m_localAnchor1.y-this.m_localCenterA.y;a=n.col1.x*f+n.col2.x*s;s=n.col1.y*f+n.col2.y*s;f=a;n=g;g=this.m_localAnchor2.x-this.m_localCenterB.x;b=this.m_localAnchor2.y-this.m_localCenterB.y;a=n.col1.x*g+n.col2.x*b;b=n.col1.y*g+n.col2.y*b;g=a;n=o.x+g-l.x-f;a=o.y+b-l.y-s;if(this.m_enableLimit){this.m_axis=y.MulMV(r,this.m_localXAxis1);this.m_a1=(n+f)*this.m_axis.y-(a+s)*this.m_axis.x;this.m_a2=g*this.m_axis.y-
b*this.m_axis.x;var v=this.m_axis.x*n+this.m_axis.y*a;if(y.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*F.b2_linearSlop){m=y.Clamp(v,-F.b2_maxLinearCorrection,F.b2_maxLinearCorrection);e=y.Abs(v);c=true}else if(v<=this.m_lowerTranslation){m=y.Clamp(v-this.m_lowerTranslation+F.b2_linearSlop,-F.b2_maxLinearCorrection,0);e=this.m_lowerTranslation-v;c=true}else if(v>=this.m_upperTranslation){m=y.Clamp(v-this.m_upperTranslation+F.b2_linearSlop,0,F.b2_maxLinearCorrection);e=v-this.m_upperTranslation;
c=true}}this.m_perp=y.MulMV(r,this.m_localYAxis1);this.m_s1=(n+f)*this.m_perp.y-(a+s)*this.m_perp.x;this.m_s2=g*this.m_perp.y-b*this.m_perp.x;r=new w;s=this.m_perp.x*n+this.m_perp.y*a;e=y.Max(e,y.Abs(s));f=0;if(c){c=this.m_invMassA;g=this.m_invMassB;b=this.m_invIA;n=this.m_invIB;this.m_K.col1.x=c+g+b*this.m_s1*this.m_s1+n*this.m_s2*this.m_s2;this.m_K.col1.y=b*this.m_s1*this.m_a1+n*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=c+g+b*this.m_a1*this.m_a1+n*this.m_a2*this.m_a2;this.m_K.Solve(r,
-s,-m)}else{c=this.m_invMassA;g=this.m_invMassB;b=this.m_invIA;n=this.m_invIB;m=c+g+b*this.m_s1*this.m_s1+n*this.m_s2*this.m_s2;c=0;c=m!=0?-s/m:0;r.x=c;r.y=0}m=r.x*this.m_perp.x+r.y*this.m_axis.x;c=r.x*this.m_perp.y+r.y*this.m_axis.y;s=r.x*this.m_s1+r.y*this.m_a1;r=r.x*this.m_s2+r.y*this.m_a2;l.x-=this.m_invMassA*m;l.y-=this.m_invMassA*c;j-=this.m_invIA*s;o.x+=this.m_invMassB*m;o.y+=this.m_invMassB*c;q+=this.m_invIB*r;d.m_sweep.a=j;h.m_sweep.a=q;d.SynchronizeTransform();h.SynchronizeTransform();return e<=
F.b2_linearSlop&&f<=F.b2_angularSlop};Box2D.inherit(z,Box2D.Dynamics.Joints.b2JointDef);z.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;z.b2LineJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new w;this.localAnchorB=new w;this.localAxisA=new w};z.prototype.b2LineJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_lineJoint;this.localAxisA.Set(1,0);this.enableLimit=false;this.upperTranslation=this.lowerTranslation=
0;this.enableMotor=false;this.motorSpeed=this.maxMotorForce=0};z.prototype.Initialize=function(d,h,l,j){this.bodyA=d;this.bodyB=h;this.localAnchorA=this.bodyA.GetLocalPoint(l);this.localAnchorB=this.bodyB.GetLocalPoint(l);this.localAxisA=this.bodyA.GetLocalVector(j)};Box2D.inherit(u,Box2D.Dynamics.Joints.b2Joint);u.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;u.b2MouseJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.K=new G;this.K1=new G;this.K2=new G;
this.m_localAnchor=new w;this.m_target=new w;this.m_impulse=new w;this.m_mass=new G;this.m_C=new w};u.prototype.GetAnchorA=function(){return this.m_target};u.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor)};u.prototype.GetReactionForce=function(d){if(d===undefined)d=0;return new w(d*this.m_impulse.x,d*this.m_impulse.y)};u.prototype.GetReactionTorque=function(){return 0};u.prototype.GetTarget=function(){return this.m_target};u.prototype.SetTarget=function(d){this.m_bodyB.IsAwake()==
false&&this.m_bodyB.SetAwake(true);this.m_target=d};u.prototype.GetMaxForce=function(){return this.m_maxForce};u.prototype.SetMaxForce=function(d){if(d===undefined)d=0;this.m_maxForce=d};u.prototype.GetFrequency=function(){return this.m_frequencyHz};u.prototype.SetFrequency=function(d){if(d===undefined)d=0;this.m_frequencyHz=d};u.prototype.GetDampingRatio=function(){return this.m_dampingRatio};u.prototype.SetDampingRatio=function(d){if(d===undefined)d=0;this.m_dampingRatio=d};u.prototype.b2MouseJoint=
function(d){this.__super.b2Joint.call(this,d);this.m_target.SetV(d.target);var h=this.m_target.x-this.m_bodyB.m_xf.position.x,l=this.m_target.y-this.m_bodyB.m_xf.position.y,j=this.m_bodyB.m_xf.R;this.m_localAnchor.x=h*j.col1.x+l*j.col1.y;this.m_localAnchor.y=h*j.col2.x+l*j.col2.y;this.m_maxForce=d.maxForce;this.m_impulse.SetZero();this.m_frequencyHz=d.frequencyHz;this.m_dampingRatio=d.dampingRatio;this.m_gamma=this.m_beta=0};u.prototype.InitVelocityConstraints=function(d){var h=this.m_bodyB,l=h.GetMass(),
j=2*Math.PI*this.m_frequencyHz,o=l*j*j;this.m_gamma=d.dt*(2*l*this.m_dampingRatio*j+d.dt*o);this.m_gamma=this.m_gamma!=0?1/this.m_gamma:0;this.m_beta=d.dt*o*this.m_gamma;o=h.m_xf.R;l=this.m_localAnchor.x-h.m_sweep.localCenter.x;j=this.m_localAnchor.y-h.m_sweep.localCenter.y;var q=o.col1.x*l+o.col2.x*j;j=o.col1.y*l+o.col2.y*j;l=q;o=h.m_invMass;q=h.m_invI;this.K1.col1.x=o;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=o;this.K2.col1.x=q*j*j;this.K2.col2.x=-q*l*j;this.K2.col1.y=-q*l*j;this.K2.col2.y=
q*l*l;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.col1.x+=this.m_gamma;this.K.col2.y+=this.m_gamma;this.K.GetInverse(this.m_mass);this.m_C.x=h.m_sweep.c.x+l-this.m_target.x;this.m_C.y=h.m_sweep.c.y+j-this.m_target.y;h.m_angularVelocity*=0.98;this.m_impulse.x*=d.dtRatio;this.m_impulse.y*=d.dtRatio;h.m_linearVelocity.x+=o*this.m_impulse.x;h.m_linearVelocity.y+=o*this.m_impulse.y;h.m_angularVelocity+=q*(l*this.m_impulse.y-j*this.m_impulse.x)};u.prototype.SolveVelocityConstraints=function(d){var h=
this.m_bodyB,l,j=0,o=0;l=h.m_xf.R;var q=this.m_localAnchor.x-h.m_sweep.localCenter.x,n=this.m_localAnchor.y-h.m_sweep.localCenter.y;j=l.col1.x*q+l.col2.x*n;n=l.col1.y*q+l.col2.y*n;q=j;j=h.m_linearVelocity.x+-h.m_angularVelocity*n;var a=h.m_linearVelocity.y+h.m_angularVelocity*q;l=this.m_mass;j=j+this.m_beta*this.m_C.x+this.m_gamma*this.m_impulse.x;o=a+this.m_beta*this.m_C.y+this.m_gamma*this.m_impulse.y;a=-(l.col1.x*j+l.col2.x*o);o=-(l.col1.y*j+l.col2.y*o);l=this.m_impulse.x;j=this.m_impulse.y;this.m_impulse.x+=
a;this.m_impulse.y+=o;d=d.dt*this.m_maxForce;this.m_impulse.LengthSquared()>d*d&&this.m_impulse.Multiply(d/this.m_impulse.Length());a=this.m_impulse.x-l;o=this.m_impulse.y-j;h.m_linearVelocity.x+=h.m_invMass*a;h.m_linearVelocity.y+=h.m_invMass*o;h.m_angularVelocity+=h.m_invI*(q*o-n*a)};u.prototype.SolvePositionConstraints=function(){return true};Box2D.inherit(D,Box2D.Dynamics.Joints.b2JointDef);D.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;D.b2MouseJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,
arguments);this.target=new w};D.prototype.b2MouseJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_mouseJoint;this.maxForce=0;this.frequencyHz=5;this.dampingRatio=0.7};Box2D.inherit(H,Box2D.Dynamics.Joints.b2Joint);H.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;H.b2PrismaticJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_localXAxis1=new w;this.m_localYAxis1=new w;this.m_axis=new w;
this.m_perp=new w;this.m_K=new K;this.m_impulse=new A};H.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};H.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};H.prototype.GetReactionForce=function(d){if(d===undefined)d=0;return new w(d*(this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.x),d*(this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.y))};H.prototype.GetReactionTorque=
function(d){if(d===undefined)d=0;return d*this.m_impulse.y};H.prototype.GetJointTranslation=function(){var d=this.m_bodyA,h=this.m_bodyB,l=d.GetWorldPoint(this.m_localAnchor1),j=h.GetWorldPoint(this.m_localAnchor2);h=j.x-l.x;l=j.y-l.y;d=d.GetWorldVector(this.m_localXAxis1);return d.x*h+d.y*l};H.prototype.GetJointSpeed=function(){var d=this.m_bodyA,h=this.m_bodyB,l;l=d.m_xf.R;var j=this.m_localAnchor1.x-d.m_sweep.localCenter.x,o=this.m_localAnchor1.y-d.m_sweep.localCenter.y,q=l.col1.x*j+l.col2.x*o;
o=l.col1.y*j+l.col2.y*o;j=q;l=h.m_xf.R;var n=this.m_localAnchor2.x-h.m_sweep.localCenter.x,a=this.m_localAnchor2.y-h.m_sweep.localCenter.y;q=l.col1.x*n+l.col2.x*a;a=l.col1.y*n+l.col2.y*a;n=q;l=h.m_sweep.c.x+n-(d.m_sweep.c.x+j);q=h.m_sweep.c.y+a-(d.m_sweep.c.y+o);var c=d.GetWorldVector(this.m_localXAxis1),g=d.m_linearVelocity,b=h.m_linearVelocity;d=d.m_angularVelocity;h=h.m_angularVelocity;return l*-d*c.y+q*d*c.x+(c.x*(b.x+-h*a-g.x- -d*o)+c.y*(b.y+h*n-g.y-d*j))};H.prototype.IsLimitEnabled=function(){return this.m_enableLimit};
H.prototype.EnableLimit=function(d){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableLimit=d};H.prototype.GetLowerLimit=function(){return this.m_lowerTranslation};H.prototype.GetUpperLimit=function(){return this.m_upperTranslation};H.prototype.SetLimits=function(d,h){if(d===undefined)d=0;if(h===undefined)h=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_lowerTranslation=d;this.m_upperTranslation=h};H.prototype.IsMotorEnabled=function(){return this.m_enableMotor};
H.prototype.EnableMotor=function(d){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_enableMotor=d};H.prototype.SetMotorSpeed=function(d){if(d===undefined)d=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=d};H.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};H.prototype.SetMaxMotorForce=function(d){if(d===undefined)d=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_maxMotorForce=d};H.prototype.GetMotorForce=function(){return this.m_motorImpulse};
H.prototype.b2PrismaticJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchor1.SetV(d.localAnchorA);this.m_localAnchor2.SetV(d.localAnchorB);this.m_localXAxis1.SetV(d.localAxisA);this.m_localYAxis1.x=-this.m_localXAxis1.y;this.m_localYAxis1.y=this.m_localXAxis1.x;this.m_refAngle=d.referenceAngle;this.m_impulse.SetZero();this.m_motorImpulse=this.m_motorMass=0;this.m_lowerTranslation=d.lowerTranslation;this.m_upperTranslation=d.upperTranslation;this.m_maxMotorForce=d.maxMotorForce;this.m_motorSpeed=
d.motorSpeed;this.m_enableLimit=d.enableLimit;this.m_enableMotor=d.enableMotor;this.m_limitState=I.e_inactiveLimit;this.m_axis.SetZero();this.m_perp.SetZero()};H.prototype.InitVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j,o=0;this.m_localCenterA.SetV(h.GetLocalCenter());this.m_localCenterB.SetV(l.GetLocalCenter());var q=h.GetTransform();l.GetTransform();j=h.m_xf.R;var n=this.m_localAnchor1.x-this.m_localCenterA.x,a=this.m_localAnchor1.y-this.m_localCenterA.y;o=j.col1.x*n+j.col2.x*
a;a=j.col1.y*n+j.col2.y*a;n=o;j=l.m_xf.R;var c=this.m_localAnchor2.x-this.m_localCenterB.x,g=this.m_localAnchor2.y-this.m_localCenterB.y;o=j.col1.x*c+j.col2.x*g;g=j.col1.y*c+j.col2.y*g;c=o;j=l.m_sweep.c.x+c-h.m_sweep.c.x-n;o=l.m_sweep.c.y+g-h.m_sweep.c.y-a;this.m_invMassA=h.m_invMass;this.m_invMassB=l.m_invMass;this.m_invIA=h.m_invI;this.m_invIB=l.m_invI;this.m_axis.SetV(y.MulMV(q.R,this.m_localXAxis1));this.m_a1=(j+n)*this.m_axis.y-(o+a)*this.m_axis.x;this.m_a2=c*this.m_axis.y-g*this.m_axis.x;this.m_motorMass=
this.m_invMassA+this.m_invMassB+this.m_invIA*this.m_a1*this.m_a1+this.m_invIB*this.m_a2*this.m_a2;if(this.m_motorMass>Number.MIN_VALUE)this.m_motorMass=1/this.m_motorMass;this.m_perp.SetV(y.MulMV(q.R,this.m_localYAxis1));this.m_s1=(j+n)*this.m_perp.y-(o+a)*this.m_perp.x;this.m_s2=c*this.m_perp.y-g*this.m_perp.x;q=this.m_invMassA;n=this.m_invMassB;a=this.m_invIA;c=this.m_invIB;this.m_K.col1.x=q+n+a*this.m_s1*this.m_s1+c*this.m_s2*this.m_s2;this.m_K.col1.y=a*this.m_s1+c*this.m_s2;this.m_K.col1.z=a*
this.m_s1*this.m_a1+c*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=a+c;this.m_K.col2.z=a*this.m_a1+c*this.m_a2;this.m_K.col3.x=this.m_K.col1.z;this.m_K.col3.y=this.m_K.col2.z;this.m_K.col3.z=q+n+a*this.m_a1*this.m_a1+c*this.m_a2*this.m_a2;if(this.m_enableLimit){j=this.m_axis.x*j+this.m_axis.y*o;if(y.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*F.b2_linearSlop)this.m_limitState=I.e_equalLimits;else if(j<=this.m_lowerTranslation){if(this.m_limitState!=I.e_atLowerLimit){this.m_limitState=
I.e_atLowerLimit;this.m_impulse.z=0}}else if(j>=this.m_upperTranslation){if(this.m_limitState!=I.e_atUpperLimit){this.m_limitState=I.e_atUpperLimit;this.m_impulse.z=0}}else{this.m_limitState=I.e_inactiveLimit;this.m_impulse.z=0}}else this.m_limitState=I.e_inactiveLimit;if(this.m_enableMotor==false)this.m_motorImpulse=0;if(d.warmStarting){this.m_impulse.x*=d.dtRatio;this.m_impulse.y*=d.dtRatio;this.m_motorImpulse*=d.dtRatio;d=this.m_impulse.x*this.m_perp.x+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.x;
j=this.m_impulse.x*this.m_perp.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_axis.y;o=this.m_impulse.x*this.m_s1+this.m_impulse.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_a1;q=this.m_impulse.x*this.m_s2+this.m_impulse.y+(this.m_motorImpulse+this.m_impulse.z)*this.m_a2;h.m_linearVelocity.x-=this.m_invMassA*d;h.m_linearVelocity.y-=this.m_invMassA*j;h.m_angularVelocity-=this.m_invIA*o;l.m_linearVelocity.x+=this.m_invMassB*d;l.m_linearVelocity.y+=this.m_invMassB*j;l.m_angularVelocity+=this.m_invIB*
q}else{this.m_impulse.SetZero();this.m_motorImpulse=0}};H.prototype.SolveVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j=h.m_linearVelocity,o=h.m_angularVelocity,q=l.m_linearVelocity,n=l.m_angularVelocity,a=0,c=0,g=0,b=0;if(this.m_enableMotor&&this.m_limitState!=I.e_equalLimits){b=this.m_motorMass*(this.m_motorSpeed-(this.m_axis.x*(q.x-j.x)+this.m_axis.y*(q.y-j.y)+this.m_a2*n-this.m_a1*o));a=this.m_motorImpulse;d=d.dt*this.m_maxMotorForce;this.m_motorImpulse=y.Clamp(this.m_motorImpulse+
b,-d,d);b=this.m_motorImpulse-a;a=b*this.m_axis.x;c=b*this.m_axis.y;g=b*this.m_a1;b=b*this.m_a2;j.x-=this.m_invMassA*a;j.y-=this.m_invMassA*c;o-=this.m_invIA*g;q.x+=this.m_invMassB*a;q.y+=this.m_invMassB*c;n+=this.m_invIB*b}g=this.m_perp.x*(q.x-j.x)+this.m_perp.y*(q.y-j.y)+this.m_s2*n-this.m_s1*o;c=n-o;if(this.m_enableLimit&&this.m_limitState!=I.e_inactiveLimit){d=this.m_axis.x*(q.x-j.x)+this.m_axis.y*(q.y-j.y)+this.m_a2*n-this.m_a1*o;a=this.m_impulse.Copy();d=this.m_K.Solve33(new A,-g,-c,-d);this.m_impulse.Add(d);
if(this.m_limitState==I.e_atLowerLimit)this.m_impulse.z=y.Max(this.m_impulse.z,0);else if(this.m_limitState==I.e_atUpperLimit)this.m_impulse.z=y.Min(this.m_impulse.z,0);g=-g-(this.m_impulse.z-a.z)*this.m_K.col3.x;c=-c-(this.m_impulse.z-a.z)*this.m_K.col3.y;c=this.m_K.Solve22(new w,g,c);c.x+=a.x;c.y+=a.y;this.m_impulse.x=c.x;this.m_impulse.y=c.y;d.x=this.m_impulse.x-a.x;d.y=this.m_impulse.y-a.y;d.z=this.m_impulse.z-a.z;a=d.x*this.m_perp.x+d.z*this.m_axis.x;c=d.x*this.m_perp.y+d.z*this.m_axis.y;g=d.x*
this.m_s1+d.y+d.z*this.m_a1;b=d.x*this.m_s2+d.y+d.z*this.m_a2}else{d=this.m_K.Solve22(new w,-g,-c);this.m_impulse.x+=d.x;this.m_impulse.y+=d.y;a=d.x*this.m_perp.x;c=d.x*this.m_perp.y;g=d.x*this.m_s1+d.y;b=d.x*this.m_s2+d.y}j.x-=this.m_invMassA*a;j.y-=this.m_invMassA*c;o-=this.m_invIA*g;q.x+=this.m_invMassB*a;q.y+=this.m_invMassB*c;n+=this.m_invIB*b;h.m_linearVelocity.SetV(j);h.m_angularVelocity=o;l.m_linearVelocity.SetV(q);l.m_angularVelocity=n};H.prototype.SolvePositionConstraints=function(){var d=
this.m_bodyA,h=this.m_bodyB,l=d.m_sweep.c,j=d.m_sweep.a,o=h.m_sweep.c,q=h.m_sweep.a,n,a=0,c=0,g=0,b=a=n=0,e=0;c=false;var f=0,m=G.FromAngle(j),r=G.FromAngle(q);n=m;e=this.m_localAnchor1.x-this.m_localCenterA.x;var s=this.m_localAnchor1.y-this.m_localCenterA.y;a=n.col1.x*e+n.col2.x*s;s=n.col1.y*e+n.col2.y*s;e=a;n=r;r=this.m_localAnchor2.x-this.m_localCenterB.x;g=this.m_localAnchor2.y-this.m_localCenterB.y;a=n.col1.x*r+n.col2.x*g;g=n.col1.y*r+n.col2.y*g;r=a;n=o.x+r-l.x-e;a=o.y+g-l.y-s;if(this.m_enableLimit){this.m_axis=
y.MulMV(m,this.m_localXAxis1);this.m_a1=(n+e)*this.m_axis.y-(a+s)*this.m_axis.x;this.m_a2=r*this.m_axis.y-g*this.m_axis.x;var v=this.m_axis.x*n+this.m_axis.y*a;if(y.Abs(this.m_upperTranslation-this.m_lowerTranslation)<2*F.b2_linearSlop){f=y.Clamp(v,-F.b2_maxLinearCorrection,F.b2_maxLinearCorrection);b=y.Abs(v);c=true}else if(v<=this.m_lowerTranslation){f=y.Clamp(v-this.m_lowerTranslation+F.b2_linearSlop,-F.b2_maxLinearCorrection,0);b=this.m_lowerTranslation-v;c=true}else if(v>=this.m_upperTranslation){f=
y.Clamp(v-this.m_upperTranslation+F.b2_linearSlop,0,F.b2_maxLinearCorrection);b=v-this.m_upperTranslation;c=true}}this.m_perp=y.MulMV(m,this.m_localYAxis1);this.m_s1=(n+e)*this.m_perp.y-(a+s)*this.m_perp.x;this.m_s2=r*this.m_perp.y-g*this.m_perp.x;m=new A;s=this.m_perp.x*n+this.m_perp.y*a;r=q-j-this.m_refAngle;b=y.Max(b,y.Abs(s));e=y.Abs(r);if(c){c=this.m_invMassA;g=this.m_invMassB;n=this.m_invIA;a=this.m_invIB;this.m_K.col1.x=c+g+n*this.m_s1*this.m_s1+a*this.m_s2*this.m_s2;this.m_K.col1.y=n*this.m_s1+
a*this.m_s2;this.m_K.col1.z=n*this.m_s1*this.m_a1+a*this.m_s2*this.m_a2;this.m_K.col2.x=this.m_K.col1.y;this.m_K.col2.y=n+a;this.m_K.col2.z=n*this.m_a1+a*this.m_a2;this.m_K.col3.x=this.m_K.col1.z;this.m_K.col3.y=this.m_K.col2.z;this.m_K.col3.z=c+g+n*this.m_a1*this.m_a1+a*this.m_a2*this.m_a2;this.m_K.Solve33(m,-s,-r,-f)}else{c=this.m_invMassA;g=this.m_invMassB;n=this.m_invIA;a=this.m_invIB;f=n*this.m_s1+a*this.m_s2;v=n+a;this.m_K.col1.Set(c+g+n*this.m_s1*this.m_s1+a*this.m_s2*this.m_s2,f,0);this.m_K.col2.Set(f,
v,0);f=this.m_K.Solve22(new w,-s,-r);m.x=f.x;m.y=f.y;m.z=0}f=m.x*this.m_perp.x+m.z*this.m_axis.x;c=m.x*this.m_perp.y+m.z*this.m_axis.y;s=m.x*this.m_s1+m.y+m.z*this.m_a1;m=m.x*this.m_s2+m.y+m.z*this.m_a2;l.x-=this.m_invMassA*f;l.y-=this.m_invMassA*c;j-=this.m_invIA*s;o.x+=this.m_invMassB*f;o.y+=this.m_invMassB*c;q+=this.m_invIB*m;d.m_sweep.a=j;h.m_sweep.a=q;d.SynchronizeTransform();h.SynchronizeTransform();return b<=F.b2_linearSlop&&e<=F.b2_angularSlop};Box2D.inherit(O,Box2D.Dynamics.Joints.b2JointDef);
O.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;O.b2PrismaticJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new w;this.localAnchorB=new w;this.localAxisA=new w};O.prototype.b2PrismaticJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_prismaticJoint;this.localAxisA.Set(1,0);this.referenceAngle=0;this.enableLimit=false;this.upperTranslation=this.lowerTranslation=0;this.enableMotor=false;this.motorSpeed=this.maxMotorForce=
0};O.prototype.Initialize=function(d,h,l,j){this.bodyA=d;this.bodyB=h;this.localAnchorA=this.bodyA.GetLocalPoint(l);this.localAnchorB=this.bodyB.GetLocalPoint(l);this.localAxisA=this.bodyA.GetLocalVector(j);this.referenceAngle=this.bodyB.GetAngle()-this.bodyA.GetAngle()};Box2D.inherit(E,Box2D.Dynamics.Joints.b2Joint);E.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;E.b2PulleyJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_groundAnchor1=new w;this.m_groundAnchor2=
new w;this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_u1=new w;this.m_u2=new w};E.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};E.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};E.prototype.GetReactionForce=function(d){if(d===undefined)d=0;return new w(d*this.m_impulse*this.m_u2.x,d*this.m_impulse*this.m_u2.y)};E.prototype.GetReactionTorque=function(){return 0};E.prototype.GetGroundAnchorA=function(){var d=
this.m_ground.m_xf.position.Copy();d.Add(this.m_groundAnchor1);return d};E.prototype.GetGroundAnchorB=function(){var d=this.m_ground.m_xf.position.Copy();d.Add(this.m_groundAnchor2);return d};E.prototype.GetLength1=function(){var d=this.m_bodyA.GetWorldPoint(this.m_localAnchor1),h=d.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x);d=d.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y);return Math.sqrt(h*h+d*d)};E.prototype.GetLength2=function(){var d=this.m_bodyB.GetWorldPoint(this.m_localAnchor2),
h=d.x-(this.m_ground.m_xf.position.x+this.m_groundAnchor2.x);d=d.y-(this.m_ground.m_xf.position.y+this.m_groundAnchor2.y);return Math.sqrt(h*h+d*d)};E.prototype.GetRatio=function(){return this.m_ratio};E.prototype.b2PulleyJoint=function(d){this.__super.b2Joint.call(this,d);this.m_ground=this.m_bodyA.m_world.m_groundBody;this.m_groundAnchor1.x=d.groundAnchorA.x-this.m_ground.m_xf.position.x;this.m_groundAnchor1.y=d.groundAnchorA.y-this.m_ground.m_xf.position.y;this.m_groundAnchor2.x=d.groundAnchorB.x-
this.m_ground.m_xf.position.x;this.m_groundAnchor2.y=d.groundAnchorB.y-this.m_ground.m_xf.position.y;this.m_localAnchor1.SetV(d.localAnchorA);this.m_localAnchor2.SetV(d.localAnchorB);this.m_ratio=d.ratio;this.m_constant=d.lengthA+this.m_ratio*d.lengthB;this.m_maxLength1=y.Min(d.maxLengthA,this.m_constant-this.m_ratio*E.b2_minPulleyLength);this.m_maxLength2=y.Min(d.maxLengthB,(this.m_constant-E.b2_minPulleyLength)/this.m_ratio);this.m_limitImpulse2=this.m_limitImpulse1=this.m_impulse=0};E.prototype.InitVelocityConstraints=
function(d){var h=this.m_bodyA,l=this.m_bodyB,j;j=h.m_xf.R;var o=this.m_localAnchor1.x-h.m_sweep.localCenter.x,q=this.m_localAnchor1.y-h.m_sweep.localCenter.y,n=j.col1.x*o+j.col2.x*q;q=j.col1.y*o+j.col2.y*q;o=n;j=l.m_xf.R;var a=this.m_localAnchor2.x-l.m_sweep.localCenter.x,c=this.m_localAnchor2.y-l.m_sweep.localCenter.y;n=j.col1.x*a+j.col2.x*c;c=j.col1.y*a+j.col2.y*c;a=n;j=l.m_sweep.c.x+a;n=l.m_sweep.c.y+c;var g=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,b=this.m_ground.m_xf.position.y+
this.m_groundAnchor2.y;this.m_u1.Set(h.m_sweep.c.x+o-(this.m_ground.m_xf.position.x+this.m_groundAnchor1.x),h.m_sweep.c.y+q-(this.m_ground.m_xf.position.y+this.m_groundAnchor1.y));this.m_u2.Set(j-g,n-b);j=this.m_u1.Length();n=this.m_u2.Length();j>F.b2_linearSlop?this.m_u1.Multiply(1/j):this.m_u1.SetZero();n>F.b2_linearSlop?this.m_u2.Multiply(1/n):this.m_u2.SetZero();if(this.m_constant-j-this.m_ratio*n>0){this.m_state=I.e_inactiveLimit;this.m_impulse=0}else this.m_state=I.e_atUpperLimit;if(j<this.m_maxLength1){this.m_limitState1=
I.e_inactiveLimit;this.m_limitImpulse1=0}else this.m_limitState1=I.e_atUpperLimit;if(n<this.m_maxLength2){this.m_limitState2=I.e_inactiveLimit;this.m_limitImpulse2=0}else this.m_limitState2=I.e_atUpperLimit;j=o*this.m_u1.y-q*this.m_u1.x;n=a*this.m_u2.y-c*this.m_u2.x;this.m_limitMass1=h.m_invMass+h.m_invI*j*j;this.m_limitMass2=l.m_invMass+l.m_invI*n*n;this.m_pulleyMass=this.m_limitMass1+this.m_ratio*this.m_ratio*this.m_limitMass2;this.m_limitMass1=1/this.m_limitMass1;this.m_limitMass2=1/this.m_limitMass2;
this.m_pulleyMass=1/this.m_pulleyMass;if(d.warmStarting){this.m_impulse*=d.dtRatio;this.m_limitImpulse1*=d.dtRatio;this.m_limitImpulse2*=d.dtRatio;d=(-this.m_impulse-this.m_limitImpulse1)*this.m_u1.x;j=(-this.m_impulse-this.m_limitImpulse1)*this.m_u1.y;n=(-this.m_ratio*this.m_impulse-this.m_limitImpulse2)*this.m_u2.x;g=(-this.m_ratio*this.m_impulse-this.m_limitImpulse2)*this.m_u2.y;h.m_linearVelocity.x+=h.m_invMass*d;h.m_linearVelocity.y+=h.m_invMass*j;h.m_angularVelocity+=h.m_invI*(o*j-q*d);l.m_linearVelocity.x+=
l.m_invMass*n;l.m_linearVelocity.y+=l.m_invMass*g;l.m_angularVelocity+=l.m_invI*(a*g-c*n)}else this.m_limitImpulse2=this.m_limitImpulse1=this.m_impulse=0};E.prototype.SolveVelocityConstraints=function(){var d=this.m_bodyA,h=this.m_bodyB,l;l=d.m_xf.R;var j=this.m_localAnchor1.x-d.m_sweep.localCenter.x,o=this.m_localAnchor1.y-d.m_sweep.localCenter.y,q=l.col1.x*j+l.col2.x*o;o=l.col1.y*j+l.col2.y*o;j=q;l=h.m_xf.R;var n=this.m_localAnchor2.x-h.m_sweep.localCenter.x,a=this.m_localAnchor2.y-h.m_sweep.localCenter.y;
q=l.col1.x*n+l.col2.x*a;a=l.col1.y*n+l.col2.y*a;n=q;var c=q=l=0,g=0;l=g=l=g=c=q=l=0;if(this.m_state==I.e_atUpperLimit){l=d.m_linearVelocity.x+-d.m_angularVelocity*o;q=d.m_linearVelocity.y+d.m_angularVelocity*j;c=h.m_linearVelocity.x+-h.m_angularVelocity*a;g=h.m_linearVelocity.y+h.m_angularVelocity*n;l=-(this.m_u1.x*l+this.m_u1.y*q)-this.m_ratio*(this.m_u2.x*c+this.m_u2.y*g);g=this.m_pulleyMass*-l;l=this.m_impulse;this.m_impulse=y.Max(0,this.m_impulse+g);g=this.m_impulse-l;l=-g*this.m_u1.x;q=-g*this.m_u1.y;
c=-this.m_ratio*g*this.m_u2.x;g=-this.m_ratio*g*this.m_u2.y;d.m_linearVelocity.x+=d.m_invMass*l;d.m_linearVelocity.y+=d.m_invMass*q;d.m_angularVelocity+=d.m_invI*(j*q-o*l);h.m_linearVelocity.x+=h.m_invMass*c;h.m_linearVelocity.y+=h.m_invMass*g;h.m_angularVelocity+=h.m_invI*(n*g-a*c)}if(this.m_limitState1==I.e_atUpperLimit){l=d.m_linearVelocity.x+-d.m_angularVelocity*o;q=d.m_linearVelocity.y+d.m_angularVelocity*j;l=-(this.m_u1.x*l+this.m_u1.y*q);g=-this.m_limitMass1*l;l=this.m_limitImpulse1;this.m_limitImpulse1=
y.Max(0,this.m_limitImpulse1+g);g=this.m_limitImpulse1-l;l=-g*this.m_u1.x;q=-g*this.m_u1.y;d.m_linearVelocity.x+=d.m_invMass*l;d.m_linearVelocity.y+=d.m_invMass*q;d.m_angularVelocity+=d.m_invI*(j*q-o*l)}if(this.m_limitState2==I.e_atUpperLimit){c=h.m_linearVelocity.x+-h.m_angularVelocity*a;g=h.m_linearVelocity.y+h.m_angularVelocity*n;l=-(this.m_u2.x*c+this.m_u2.y*g);g=-this.m_limitMass2*l;l=this.m_limitImpulse2;this.m_limitImpulse2=y.Max(0,this.m_limitImpulse2+g);g=this.m_limitImpulse2-l;c=-g*this.m_u2.x;
g=-g*this.m_u2.y;h.m_linearVelocity.x+=h.m_invMass*c;h.m_linearVelocity.y+=h.m_invMass*g;h.m_angularVelocity+=h.m_invI*(n*g-a*c)}};E.prototype.SolvePositionConstraints=function(){var d=this.m_bodyA,h=this.m_bodyB,l,j=this.m_ground.m_xf.position.x+this.m_groundAnchor1.x,o=this.m_ground.m_xf.position.y+this.m_groundAnchor1.y,q=this.m_ground.m_xf.position.x+this.m_groundAnchor2.x,n=this.m_ground.m_xf.position.y+this.m_groundAnchor2.y,a=0,c=0,g=0,b=0,e=l=0,f=0,m=0,r=e=m=l=e=l=0;if(this.m_state==I.e_atUpperLimit){l=
d.m_xf.R;a=this.m_localAnchor1.x-d.m_sweep.localCenter.x;c=this.m_localAnchor1.y-d.m_sweep.localCenter.y;e=l.col1.x*a+l.col2.x*c;c=l.col1.y*a+l.col2.y*c;a=e;l=h.m_xf.R;g=this.m_localAnchor2.x-h.m_sweep.localCenter.x;b=this.m_localAnchor2.y-h.m_sweep.localCenter.y;e=l.col1.x*g+l.col2.x*b;b=l.col1.y*g+l.col2.y*b;g=e;l=d.m_sweep.c.x+a;e=d.m_sweep.c.y+c;f=h.m_sweep.c.x+g;m=h.m_sweep.c.y+b;this.m_u1.Set(l-j,e-o);this.m_u2.Set(f-q,m-n);l=this.m_u1.Length();e=this.m_u2.Length();l>F.b2_linearSlop?this.m_u1.Multiply(1/
l):this.m_u1.SetZero();e>F.b2_linearSlop?this.m_u2.Multiply(1/e):this.m_u2.SetZero();l=this.m_constant-l-this.m_ratio*e;r=y.Max(r,-l);l=y.Clamp(l+F.b2_linearSlop,-F.b2_maxLinearCorrection,0);m=-this.m_pulleyMass*l;l=-m*this.m_u1.x;e=-m*this.m_u1.y;f=-this.m_ratio*m*this.m_u2.x;m=-this.m_ratio*m*this.m_u2.y;d.m_sweep.c.x+=d.m_invMass*l;d.m_sweep.c.y+=d.m_invMass*e;d.m_sweep.a+=d.m_invI*(a*e-c*l);h.m_sweep.c.x+=h.m_invMass*f;h.m_sweep.c.y+=h.m_invMass*m;h.m_sweep.a+=h.m_invI*(g*m-b*f);d.SynchronizeTransform();
h.SynchronizeTransform()}if(this.m_limitState1==I.e_atUpperLimit){l=d.m_xf.R;a=this.m_localAnchor1.x-d.m_sweep.localCenter.x;c=this.m_localAnchor1.y-d.m_sweep.localCenter.y;e=l.col1.x*a+l.col2.x*c;c=l.col1.y*a+l.col2.y*c;a=e;l=d.m_sweep.c.x+a;e=d.m_sweep.c.y+c;this.m_u1.Set(l-j,e-o);l=this.m_u1.Length();if(l>F.b2_linearSlop){this.m_u1.x*=1/l;this.m_u1.y*=1/l}else this.m_u1.SetZero();l=this.m_maxLength1-l;r=y.Max(r,-l);l=y.Clamp(l+F.b2_linearSlop,-F.b2_maxLinearCorrection,0);m=-this.m_limitMass1*l;
l=-m*this.m_u1.x;e=-m*this.m_u1.y;d.m_sweep.c.x+=d.m_invMass*l;d.m_sweep.c.y+=d.m_invMass*e;d.m_sweep.a+=d.m_invI*(a*e-c*l);d.SynchronizeTransform()}if(this.m_limitState2==I.e_atUpperLimit){l=h.m_xf.R;g=this.m_localAnchor2.x-h.m_sweep.localCenter.x;b=this.m_localAnchor2.y-h.m_sweep.localCenter.y;e=l.col1.x*g+l.col2.x*b;b=l.col1.y*g+l.col2.y*b;g=e;f=h.m_sweep.c.x+g;m=h.m_sweep.c.y+b;this.m_u2.Set(f-q,m-n);e=this.m_u2.Length();if(e>F.b2_linearSlop){this.m_u2.x*=1/e;this.m_u2.y*=1/e}else this.m_u2.SetZero();
l=this.m_maxLength2-e;r=y.Max(r,-l);l=y.Clamp(l+F.b2_linearSlop,-F.b2_maxLinearCorrection,0);m=-this.m_limitMass2*l;f=-m*this.m_u2.x;m=-m*this.m_u2.y;h.m_sweep.c.x+=h.m_invMass*f;h.m_sweep.c.y+=h.m_invMass*m;h.m_sweep.a+=h.m_invI*(g*m-b*f);h.SynchronizeTransform()}return r<F.b2_linearSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2PulleyJoint.b2_minPulleyLength=2});Box2D.inherit(R,Box2D.Dynamics.Joints.b2JointDef);R.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;R.b2PulleyJointDef=
function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.groundAnchorA=new w;this.groundAnchorB=new w;this.localAnchorA=new w;this.localAnchorB=new w};R.prototype.b2PulleyJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_pulleyJoint;this.groundAnchorA.Set(-1,1);this.groundAnchorB.Set(1,1);this.localAnchorA.Set(-1,0);this.localAnchorB.Set(1,0);this.maxLengthB=this.lengthB=this.maxLengthA=this.lengthA=0;this.ratio=1;this.collideConnected=true};R.prototype.Initialize=
function(d,h,l,j,o,q,n){if(n===undefined)n=0;this.bodyA=d;this.bodyB=h;this.groundAnchorA.SetV(l);this.groundAnchorB.SetV(j);this.localAnchorA=this.bodyA.GetLocalPoint(o);this.localAnchorB=this.bodyB.GetLocalPoint(q);d=o.x-l.x;l=o.y-l.y;this.lengthA=Math.sqrt(d*d+l*l);l=q.x-j.x;j=q.y-j.y;this.lengthB=Math.sqrt(l*l+j*j);this.ratio=n;n=this.lengthA+this.ratio*this.lengthB;this.maxLengthA=n-this.ratio*E.b2_minPulleyLength;this.maxLengthB=(n-E.b2_minPulleyLength)/this.ratio};Box2D.inherit(N,Box2D.Dynamics.Joints.b2Joint);
N.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;N.b2RevoluteJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.K=new G;this.K1=new G;this.K2=new G;this.K3=new G;this.impulse3=new A;this.impulse2=new w;this.reduced=new w;this.m_localAnchor1=new w;this.m_localAnchor2=new w;this.m_impulse=new A;this.m_mass=new K};N.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchor1)};N.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchor2)};
N.prototype.GetReactionForce=function(d){if(d===undefined)d=0;return new w(d*this.m_impulse.x,d*this.m_impulse.y)};N.prototype.GetReactionTorque=function(d){if(d===undefined)d=0;return d*this.m_impulse.z};N.prototype.GetJointAngle=function(){return this.m_bodyB.m_sweep.a-this.m_bodyA.m_sweep.a-this.m_referenceAngle};N.prototype.GetJointSpeed=function(){return this.m_bodyB.m_angularVelocity-this.m_bodyA.m_angularVelocity};N.prototype.IsLimitEnabled=function(){return this.m_enableLimit};N.prototype.EnableLimit=
function(d){this.m_enableLimit=d};N.prototype.GetLowerLimit=function(){return this.m_lowerAngle};N.prototype.GetUpperLimit=function(){return this.m_upperAngle};N.prototype.SetLimits=function(d,h){if(d===undefined)d=0;if(h===undefined)h=0;this.m_lowerAngle=d;this.m_upperAngle=h};N.prototype.IsMotorEnabled=function(){this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);return this.m_enableMotor};N.prototype.EnableMotor=function(d){this.m_enableMotor=d};N.prototype.SetMotorSpeed=function(d){if(d===
undefined)d=0;this.m_bodyA.SetAwake(true);this.m_bodyB.SetAwake(true);this.m_motorSpeed=d};N.prototype.GetMotorSpeed=function(){return this.m_motorSpeed};N.prototype.SetMaxMotorTorque=function(d){if(d===undefined)d=0;this.m_maxMotorTorque=d};N.prototype.GetMotorTorque=function(){return this.m_maxMotorTorque};N.prototype.b2RevoluteJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchor1.SetV(d.localAnchorA);this.m_localAnchor2.SetV(d.localAnchorB);this.m_referenceAngle=d.referenceAngle;
this.m_impulse.SetZero();this.m_motorImpulse=0;this.m_lowerAngle=d.lowerAngle;this.m_upperAngle=d.upperAngle;this.m_maxMotorTorque=d.maxMotorTorque;this.m_motorSpeed=d.motorSpeed;this.m_enableLimit=d.enableLimit;this.m_enableMotor=d.enableMotor;this.m_limitState=I.e_inactiveLimit};N.prototype.InitVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j,o=0;j=h.m_xf.R;var q=this.m_localAnchor1.x-h.m_sweep.localCenter.x,n=this.m_localAnchor1.y-h.m_sweep.localCenter.y;o=j.col1.x*q+j.col2.x*
n;n=j.col1.y*q+j.col2.y*n;q=o;j=l.m_xf.R;var a=this.m_localAnchor2.x-l.m_sweep.localCenter.x,c=this.m_localAnchor2.y-l.m_sweep.localCenter.y;o=j.col1.x*a+j.col2.x*c;c=j.col1.y*a+j.col2.y*c;a=o;j=h.m_invMass;o=l.m_invMass;var g=h.m_invI,b=l.m_invI;this.m_mass.col1.x=j+o+n*n*g+c*c*b;this.m_mass.col2.x=-n*q*g-c*a*b;this.m_mass.col3.x=-n*g-c*b;this.m_mass.col1.y=this.m_mass.col2.x;this.m_mass.col2.y=j+o+q*q*g+a*a*b;this.m_mass.col3.y=q*g+a*b;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;
this.m_mass.col3.z=g+b;this.m_motorMass=1/(g+b);if(this.m_enableMotor==false)this.m_motorImpulse=0;if(this.m_enableLimit){var e=l.m_sweep.a-h.m_sweep.a-this.m_referenceAngle;if(y.Abs(this.m_upperAngle-this.m_lowerAngle)<2*F.b2_angularSlop)this.m_limitState=I.e_equalLimits;else if(e<=this.m_lowerAngle){if(this.m_limitState!=I.e_atLowerLimit)this.m_impulse.z=0;this.m_limitState=I.e_atLowerLimit}else if(e>=this.m_upperAngle){if(this.m_limitState!=I.e_atUpperLimit)this.m_impulse.z=0;this.m_limitState=
I.e_atUpperLimit}else{this.m_limitState=I.e_inactiveLimit;this.m_impulse.z=0}}else this.m_limitState=I.e_inactiveLimit;if(d.warmStarting){this.m_impulse.x*=d.dtRatio;this.m_impulse.y*=d.dtRatio;this.m_motorImpulse*=d.dtRatio;d=this.m_impulse.x;e=this.m_impulse.y;h.m_linearVelocity.x-=j*d;h.m_linearVelocity.y-=j*e;h.m_angularVelocity-=g*(q*e-n*d+this.m_motorImpulse+this.m_impulse.z);l.m_linearVelocity.x+=o*d;l.m_linearVelocity.y+=o*e;l.m_angularVelocity+=b*(a*e-c*d+this.m_motorImpulse+this.m_impulse.z)}else{this.m_impulse.SetZero();
this.m_motorImpulse=0}};N.prototype.SolveVelocityConstraints=function(d){var h=this.m_bodyA,l=this.m_bodyB,j=0,o=j=0,q=0,n=0,a=0,c=h.m_linearVelocity,g=h.m_angularVelocity,b=l.m_linearVelocity,e=l.m_angularVelocity,f=h.m_invMass,m=l.m_invMass,r=h.m_invI,s=l.m_invI;if(this.m_enableMotor&&this.m_limitState!=I.e_equalLimits){o=this.m_motorMass*-(e-g-this.m_motorSpeed);q=this.m_motorImpulse;n=d.dt*this.m_maxMotorTorque;this.m_motorImpulse=y.Clamp(this.m_motorImpulse+o,-n,n);o=this.m_motorImpulse-q;g-=
r*o;e+=s*o}if(this.m_enableLimit&&this.m_limitState!=I.e_inactiveLimit){d=h.m_xf.R;o=this.m_localAnchor1.x-h.m_sweep.localCenter.x;q=this.m_localAnchor1.y-h.m_sweep.localCenter.y;j=d.col1.x*o+d.col2.x*q;q=d.col1.y*o+d.col2.y*q;o=j;d=l.m_xf.R;n=this.m_localAnchor2.x-l.m_sweep.localCenter.x;a=this.m_localAnchor2.y-l.m_sweep.localCenter.y;j=d.col1.x*n+d.col2.x*a;a=d.col1.y*n+d.col2.y*a;n=j;d=b.x+-e*a-c.x- -g*q;var v=b.y+e*n-c.y-g*o;this.m_mass.Solve33(this.impulse3,-d,-v,-(e-g));if(this.m_limitState==
I.e_equalLimits)this.m_impulse.Add(this.impulse3);else if(this.m_limitState==I.e_atLowerLimit){j=this.m_impulse.z+this.impulse3.z;if(j<0){this.m_mass.Solve22(this.reduced,-d,-v);this.impulse3.x=this.reduced.x;this.impulse3.y=this.reduced.y;this.impulse3.z=-this.m_impulse.z;this.m_impulse.x+=this.reduced.x;this.m_impulse.y+=this.reduced.y;this.m_impulse.z=0}}else if(this.m_limitState==I.e_atUpperLimit){j=this.m_impulse.z+this.impulse3.z;if(j>0){this.m_mass.Solve22(this.reduced,-d,-v);this.impulse3.x=
this.reduced.x;this.impulse3.y=this.reduced.y;this.impulse3.z=-this.m_impulse.z;this.m_impulse.x+=this.reduced.x;this.m_impulse.y+=this.reduced.y;this.m_impulse.z=0}}c.x-=f*this.impulse3.x;c.y-=f*this.impulse3.y;g-=r*(o*this.impulse3.y-q*this.impulse3.x+this.impulse3.z);b.x+=m*this.impulse3.x;b.y+=m*this.impulse3.y;e+=s*(n*this.impulse3.y-a*this.impulse3.x+this.impulse3.z)}else{d=h.m_xf.R;o=this.m_localAnchor1.x-h.m_sweep.localCenter.x;q=this.m_localAnchor1.y-h.m_sweep.localCenter.y;j=d.col1.x*o+
d.col2.x*q;q=d.col1.y*o+d.col2.y*q;o=j;d=l.m_xf.R;n=this.m_localAnchor2.x-l.m_sweep.localCenter.x;a=this.m_localAnchor2.y-l.m_sweep.localCenter.y;j=d.col1.x*n+d.col2.x*a;a=d.col1.y*n+d.col2.y*a;n=j;this.m_mass.Solve22(this.impulse2,-(b.x+-e*a-c.x- -g*q),-(b.y+e*n-c.y-g*o));this.m_impulse.x+=this.impulse2.x;this.m_impulse.y+=this.impulse2.y;c.x-=f*this.impulse2.x;c.y-=f*this.impulse2.y;g-=r*(o*this.impulse2.y-q*this.impulse2.x);b.x+=m*this.impulse2.x;b.y+=m*this.impulse2.y;e+=s*(n*this.impulse2.y-
a*this.impulse2.x)}h.m_linearVelocity.SetV(c);h.m_angularVelocity=g;l.m_linearVelocity.SetV(b);l.m_angularVelocity=e};N.prototype.SolvePositionConstraints=function(){var d=0,h,l=this.m_bodyA,j=this.m_bodyB,o=0,q=h=0,n=0,a=0;if(this.m_enableLimit&&this.m_limitState!=I.e_inactiveLimit){d=j.m_sweep.a-l.m_sweep.a-this.m_referenceAngle;var c=0;if(this.m_limitState==I.e_equalLimits){d=y.Clamp(d-this.m_lowerAngle,-F.b2_maxAngularCorrection,F.b2_maxAngularCorrection);c=-this.m_motorMass*d;o=y.Abs(d)}else if(this.m_limitState==
I.e_atLowerLimit){d=d-this.m_lowerAngle;o=-d;d=y.Clamp(d+F.b2_angularSlop,-F.b2_maxAngularCorrection,0);c=-this.m_motorMass*d}else if(this.m_limitState==I.e_atUpperLimit){o=d=d-this.m_upperAngle;d=y.Clamp(d-F.b2_angularSlop,0,F.b2_maxAngularCorrection);c=-this.m_motorMass*d}l.m_sweep.a-=l.m_invI*c;j.m_sweep.a+=j.m_invI*c;l.SynchronizeTransform();j.SynchronizeTransform()}h=l.m_xf.R;c=this.m_localAnchor1.x-l.m_sweep.localCenter.x;d=this.m_localAnchor1.y-l.m_sweep.localCenter.y;q=h.col1.x*c+h.col2.x*
d;d=h.col1.y*c+h.col2.y*d;c=q;h=j.m_xf.R;var g=this.m_localAnchor2.x-j.m_sweep.localCenter.x,b=this.m_localAnchor2.y-j.m_sweep.localCenter.y;q=h.col1.x*g+h.col2.x*b;b=h.col1.y*g+h.col2.y*b;g=q;n=j.m_sweep.c.x+g-l.m_sweep.c.x-c;a=j.m_sweep.c.y+b-l.m_sweep.c.y-d;var e=n*n+a*a;h=Math.sqrt(e);q=l.m_invMass;var f=j.m_invMass,m=l.m_invI,r=j.m_invI,s=10*F.b2_linearSlop;if(e>s*s){e=1/(q+f);n=e*-n;a=e*-a;l.m_sweep.c.x-=0.5*q*n;l.m_sweep.c.y-=0.5*q*a;j.m_sweep.c.x+=0.5*f*n;j.m_sweep.c.y+=0.5*f*a;n=j.m_sweep.c.x+
g-l.m_sweep.c.x-c;a=j.m_sweep.c.y+b-l.m_sweep.c.y-d}this.K1.col1.x=q+f;this.K1.col2.x=0;this.K1.col1.y=0;this.K1.col2.y=q+f;this.K2.col1.x=m*d*d;this.K2.col2.x=-m*c*d;this.K2.col1.y=-m*c*d;this.K2.col2.y=m*c*c;this.K3.col1.x=r*b*b;this.K3.col2.x=-r*g*b;this.K3.col1.y=-r*g*b;this.K3.col2.y=r*g*g;this.K.SetM(this.K1);this.K.AddM(this.K2);this.K.AddM(this.K3);this.K.Solve(N.tImpulse,-n,-a);n=N.tImpulse.x;a=N.tImpulse.y;l.m_sweep.c.x-=l.m_invMass*n;l.m_sweep.c.y-=l.m_invMass*a;l.m_sweep.a-=l.m_invI*(c*
a-d*n);j.m_sweep.c.x+=j.m_invMass*n;j.m_sweep.c.y+=j.m_invMass*a;j.m_sweep.a+=j.m_invI*(g*a-b*n);l.SynchronizeTransform();j.SynchronizeTransform();return h<=F.b2_linearSlop&&o<=F.b2_angularSlop};Box2D.postDefs.push(function(){Box2D.Dynamics.Joints.b2RevoluteJoint.tImpulse=new w});Box2D.inherit(S,Box2D.Dynamics.Joints.b2JointDef);S.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;S.b2RevoluteJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=
new w;this.localAnchorB=new w};S.prototype.b2RevoluteJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_revoluteJoint;this.localAnchorA.Set(0,0);this.localAnchorB.Set(0,0);this.motorSpeed=this.maxMotorTorque=this.upperAngle=this.lowerAngle=this.referenceAngle=0;this.enableMotor=this.enableLimit=false};S.prototype.Initialize=function(d,h,l){this.bodyA=d;this.bodyB=h;this.localAnchorA=this.bodyA.GetLocalPoint(l);this.localAnchorB=this.bodyB.GetLocalPoint(l);this.referenceAngle=this.bodyB.GetAngle()-
this.bodyA.GetAngle()};Box2D.inherit(aa,Box2D.Dynamics.Joints.b2Joint);aa.prototype.__super=Box2D.Dynamics.Joints.b2Joint.prototype;aa.b2WeldJoint=function(){Box2D.Dynamics.Joints.b2Joint.b2Joint.apply(this,arguments);this.m_localAnchorA=new w;this.m_localAnchorB=new w;this.m_impulse=new A;this.m_mass=new K};aa.prototype.GetAnchorA=function(){return this.m_bodyA.GetWorldPoint(this.m_localAnchorA)};aa.prototype.GetAnchorB=function(){return this.m_bodyB.GetWorldPoint(this.m_localAnchorB)};aa.prototype.GetReactionForce=
function(d){if(d===undefined)d=0;return new w(d*this.m_impulse.x,d*this.m_impulse.y)};aa.prototype.GetReactionTorque=function(d){if(d===undefined)d=0;return d*this.m_impulse.z};aa.prototype.b2WeldJoint=function(d){this.__super.b2Joint.call(this,d);this.m_localAnchorA.SetV(d.localAnchorA);this.m_localAnchorB.SetV(d.localAnchorB);this.m_referenceAngle=d.referenceAngle;this.m_impulse.SetZero();this.m_mass=new K};aa.prototype.InitVelocityConstraints=function(d){var h,l=0,j=this.m_bodyA,o=this.m_bodyB;
h=j.m_xf.R;var q=this.m_localAnchorA.x-j.m_sweep.localCenter.x,n=this.m_localAnchorA.y-j.m_sweep.localCenter.y;l=h.col1.x*q+h.col2.x*n;n=h.col1.y*q+h.col2.y*n;q=l;h=o.m_xf.R;var a=this.m_localAnchorB.x-o.m_sweep.localCenter.x,c=this.m_localAnchorB.y-o.m_sweep.localCenter.y;l=h.col1.x*a+h.col2.x*c;c=h.col1.y*a+h.col2.y*c;a=l;h=j.m_invMass;l=o.m_invMass;var g=j.m_invI,b=o.m_invI;this.m_mass.col1.x=h+l+n*n*g+c*c*b;this.m_mass.col2.x=-n*q*g-c*a*b;this.m_mass.col3.x=-n*g-c*b;this.m_mass.col1.y=this.m_mass.col2.x;
this.m_mass.col2.y=h+l+q*q*g+a*a*b;this.m_mass.col3.y=q*g+a*b;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;this.m_mass.col3.z=g+b;if(d.warmStarting){this.m_impulse.x*=d.dtRatio;this.m_impulse.y*=d.dtRatio;this.m_impulse.z*=d.dtRatio;j.m_linearVelocity.x-=h*this.m_impulse.x;j.m_linearVelocity.y-=h*this.m_impulse.y;j.m_angularVelocity-=g*(q*this.m_impulse.y-n*this.m_impulse.x+this.m_impulse.z);o.m_linearVelocity.x+=l*this.m_impulse.x;o.m_linearVelocity.y+=l*this.m_impulse.y;
o.m_angularVelocity+=b*(a*this.m_impulse.y-c*this.m_impulse.x+this.m_impulse.z)}else this.m_impulse.SetZero()};aa.prototype.SolveVelocityConstraints=function(){var d,h=0,l=this.m_bodyA,j=this.m_bodyB,o=l.m_linearVelocity,q=l.m_angularVelocity,n=j.m_linearVelocity,a=j.m_angularVelocity,c=l.m_invMass,g=j.m_invMass,b=l.m_invI,e=j.m_invI;d=l.m_xf.R;var f=this.m_localAnchorA.x-l.m_sweep.localCenter.x,m=this.m_localAnchorA.y-l.m_sweep.localCenter.y;h=d.col1.x*f+d.col2.x*m;m=d.col1.y*f+d.col2.y*m;f=h;d=
j.m_xf.R;var r=this.m_localAnchorB.x-j.m_sweep.localCenter.x,s=this.m_localAnchorB.y-j.m_sweep.localCenter.y;h=d.col1.x*r+d.col2.x*s;s=d.col1.y*r+d.col2.y*s;r=h;d=n.x-a*s-o.x+q*m;h=n.y+a*r-o.y-q*f;var v=a-q,t=new A;this.m_mass.Solve33(t,-d,-h,-v);this.m_impulse.Add(t);o.x-=c*t.x;o.y-=c*t.y;q-=b*(f*t.y-m*t.x+t.z);n.x+=g*t.x;n.y+=g*t.y;a+=e*(r*t.y-s*t.x+t.z);l.m_angularVelocity=q;j.m_angularVelocity=a};aa.prototype.SolvePositionConstraints=function(){var d,h=0,l=this.m_bodyA,j=this.m_bodyB;d=l.m_xf.R;
var o=this.m_localAnchorA.x-l.m_sweep.localCenter.x,q=this.m_localAnchorA.y-l.m_sweep.localCenter.y;h=d.col1.x*o+d.col2.x*q;q=d.col1.y*o+d.col2.y*q;o=h;d=j.m_xf.R;var n=this.m_localAnchorB.x-j.m_sweep.localCenter.x,a=this.m_localAnchorB.y-j.m_sweep.localCenter.y;h=d.col1.x*n+d.col2.x*a;a=d.col1.y*n+d.col2.y*a;n=h;d=l.m_invMass;h=j.m_invMass;var c=l.m_invI,g=j.m_invI,b=j.m_sweep.c.x+n-l.m_sweep.c.x-o,e=j.m_sweep.c.y+a-l.m_sweep.c.y-q,f=j.m_sweep.a-l.m_sweep.a-this.m_referenceAngle,m=10*F.b2_linearSlop,
r=Math.sqrt(b*b+e*e),s=y.Abs(f);if(r>m){c*=1;g*=1}this.m_mass.col1.x=d+h+q*q*c+a*a*g;this.m_mass.col2.x=-q*o*c-a*n*g;this.m_mass.col3.x=-q*c-a*g;this.m_mass.col1.y=this.m_mass.col2.x;this.m_mass.col2.y=d+h+o*o*c+n*n*g;this.m_mass.col3.y=o*c+n*g;this.m_mass.col1.z=this.m_mass.col3.x;this.m_mass.col2.z=this.m_mass.col3.y;this.m_mass.col3.z=c+g;m=new A;this.m_mass.Solve33(m,-b,-e,-f);l.m_sweep.c.x-=d*m.x;l.m_sweep.c.y-=d*m.y;l.m_sweep.a-=c*(o*m.y-q*m.x+m.z);j.m_sweep.c.x+=h*m.x;j.m_sweep.c.y+=h*m.y;
j.m_sweep.a+=g*(n*m.y-a*m.x+m.z);l.SynchronizeTransform();j.SynchronizeTransform();return r<=F.b2_linearSlop&&s<=F.b2_angularSlop};Box2D.inherit(Z,Box2D.Dynamics.Joints.b2JointDef);Z.prototype.__super=Box2D.Dynamics.Joints.b2JointDef.prototype;Z.b2WeldJointDef=function(){Box2D.Dynamics.Joints.b2JointDef.b2JointDef.apply(this,arguments);this.localAnchorA=new w;this.localAnchorB=new w};Z.prototype.b2WeldJointDef=function(){this.__super.b2JointDef.call(this);this.type=I.e_weldJoint;this.referenceAngle=
0};Z.prototype.Initialize=function(d,h,l){this.bodyA=d;this.bodyB=h;this.localAnchorA.SetV(this.bodyA.GetLocalPoint(l));this.localAnchorB.SetV(this.bodyB.GetLocalPoint(l));this.referenceAngle=this.bodyB.GetAngle()-this.bodyA.GetAngle()}})();
(function(){var F=Box2D.Dynamics.b2DebugDraw;F.b2DebugDraw=function(){this.m_xformScale=this.m_fillAlpha=this.m_alpha=this.m_lineThickness=this.m_drawScale=1;var G=this;this.m_sprite={graphics:{clear:function(){G.m_ctx.clearRect(0,0,0,0)}}}};F.prototype._color=function(G,K){return"rgba("+((G&16711680)>>16)+","+((G&65280)>>8)+","+(G&255)+","+K+")"};F.prototype.b2DebugDraw=function(){this.m_drawFlags=0};F.prototype.SetFlags=function(G){if(G===undefined)G=0;this.m_drawFlags=
G};F.prototype.GetFlags=function(){return this.m_drawFlags};F.prototype.AppendFlags=function(G){if(G===undefined)G=0;this.m_drawFlags|=G};F.prototype.ClearFlags=function(G){if(G===undefined)G=0;this.m_drawFlags&=~G};F.prototype.SetSprite=function(G){this.m_ctx=G};F.prototype.GetSprite=function(){return this.m_ctx};F.prototype.SetDrawScale=function(G){if(G===undefined)G=0;this.m_drawScale=G};F.prototype.GetDrawScale=function(){return this.m_drawScale};F.prototype.SetLineThickness=function(G){if(G===
undefined)G=0;this.m_lineThickness=G;this.m_ctx.strokeWidth=G};F.prototype.GetLineThickness=function(){return this.m_lineThickness};F.prototype.SetAlpha=function(G){if(G===undefined)G=0;this.m_alpha=G};F.prototype.GetAlpha=function(){return this.m_alpha};F.prototype.SetFillAlpha=function(G){if(G===undefined)G=0;this.m_fillAlpha=G};F.prototype.GetFillAlpha=function(){return this.m_fillAlpha};F.prototype.SetXFormScale=function(G){if(G===undefined)G=0;this.m_xformScale=G};F.prototype.GetXFormScale=function(){return this.m_xformScale};
F.prototype.DrawPolygon=function(G,K,y){if(K){var w=this.m_ctx,A=this.m_drawScale;w.beginPath();w.strokeStyle=this._color(y.color,this.m_alpha);w.moveTo(G[0].x*A,G[0].y*A);for(y=1;y<K;y++)w.lineTo(G[y].x*A,G[y].y*A);w.lineTo(G[0].x*A,G[0].y*A);w.closePath();w.stroke()}};F.prototype.DrawSolidPolygon=function(G,K,y){if(K){var w=this.m_ctx,A=this.m_drawScale;w.beginPath();w.strokeStyle=this._color(y.color,this.m_alpha);w.fillStyle=this._color(y.color,this.m_fillAlpha);w.moveTo(G[0].x*A,G[0].y*A);for(y=
1;y<K;y++)w.lineTo(G[y].x*A,G[y].y*A);w.lineTo(G[0].x*A,G[0].y*A);w.closePath();w.fill();w.stroke()}};F.prototype.DrawCircle=function(G,K,y){if(K){var w=this.m_ctx,A=this.m_drawScale;w.beginPath();w.strokeStyle=this._color(y.color,this.m_alpha);w.arc(G.x*A,G.y*A,K*A,0,Math.PI*2,true);w.closePath();w.stroke()}};F.prototype.DrawSolidCircle=function(G,K,y,w){if(K){var A=this.m_ctx,U=this.m_drawScale,p=G.x*U,B=G.y*U;A.moveTo(0,0);A.beginPath();A.strokeStyle=this._color(w.color,this.m_alpha);A.fillStyle=
this._color(w.color,this.m_fillAlpha);A.arc(p,B,K*U,0,Math.PI*2,true);A.moveTo(p,B);A.lineTo((G.x+y.x*K)*U,(G.y+y.y*K)*U);A.closePath();A.fill();A.stroke()}};F.prototype.DrawSegment=function(G,K,y){var w=this.m_ctx,A=this.m_drawScale;w.strokeStyle=this._color(y.color,this.m_alpha);w.beginPath();w.moveTo(G.x*A,G.y*A);w.lineTo(K.x*A,K.y*A);w.closePath();w.stroke()};F.prototype.DrawTransform=function(G){var K=this.m_ctx,y=this.m_drawScale;K.beginPath();K.strokeStyle=this._color(16711680,this.m_alpha);
K.moveTo(G.position.x*y,G.position.y*y);K.lineTo((G.position.x+this.m_xformScale*G.R.col1.x)*y,(G.position.y+this.m_xformScale*G.R.col1.y)*y);K.strokeStyle=this._color(65280,this.m_alpha);K.moveTo(G.position.x*y,G.position.y*y);K.lineTo((G.position.x+this.m_xformScale*G.R.col2.x)*y,(G.position.y+this.m_xformScale*G.R.col2.y)*y);K.closePath();K.stroke()}})();var i;for(i=0;i<Box2D.postDefs.length;++i)Box2D.postDefs[i]();delete Box2D.postDefs;


var b2Vec2 = Box2D.Common.Math.b2Vec2,
b2AABB = Box2D.Collision.b2AABB,
b2BodyDef = Box2D.Dynamics.b2BodyDef,
b2Body = Box2D.Dynamics.b2Body,
b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
b2Fixture = Box2D.Dynamics.b2Fixture,
b2World = Box2D.Dynamics.b2World,
b2MassData = Box2D.Collision.Shapes.b2MassData,
b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef,
b2RevoluteJointDef =  Box2D.Dynamics.Joints.b2RevoluteJointDef,
b2RevoluteJoint  =  Box2D.Dynamics.Joints.b2RevoluteJoint,
b2JointDef =  Box2D.Dynamics.Joints.b2JointDef,
b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef;
//------------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------------
//END BOX2D PHYSICS ENGINE


//GAME WINDOW CLOSES
//------------------------------------------------------------------
//------------------------------------------------------------------
/*
window.onbeforeunload = function(e){
	e = e || window.event;
	// For IE and Firefox prior to version 4
	if (e) {
	   // e.returnValue = 'Closing Game';
	}
	// For Safari
   /// return 'Closing Game';
};
*/
//------------------------------------------------------------------
//------------------------------------------------------------------
//GAME WINDOW CLOSES

//LOADING SOUNDS CONTRIBUTING TO LOAD PROGRESS
//Pulled until audio is more reliable
//------------------------------------------------------------------
//------------------------------------------------------------------
/*
//in the future might want to add audio files to the load
//this.Scene.numSoundsToLoad = Object.getOwnPropertyNames(this.sounds).length;
//this.Scene.percEachFile = Math.round(100/(this.Scene.images.length + Object.getOwnPropertyNames(this.sounds).length));

//in the future might want to add audio files to the load
///sounds
var numSoundsLoaded = 0;
var soundNames = Object.getOwnPropertyNames(this.sounds);
for(var i=0;i<this.Scene.numSoundsToLoad;i++){
	if(this.sounds[soundNames[i]].readyState == 4){
		numSoundsLoaded += 1;
		console.log(soundNames[i]);
	}			
}	
//give the percentage
this.Scene.percLoaded = (numImagesLoaded+numSoundsLoaded)*this.Scene.percEachFile;

if(numImagesLoaded == this.Scene.numImagesToLoad && numSoundsLoaded == this.Scene.numSoundsToLoad){
	//load is done
	this.Scene.percLoaded = 100;
	clearInterval(this.Scene.loadProgress); 
	this.Scene.loadCallBack();
}
*/
//------------------------------------------------------------------
//------------------------------------------------------------------
//LOADING SOUNDS CONTRIBUTING TO LOAD PROGRESS


//OLD TILE ANIMATION
//------------------------------------------------------------------
//------------------------------------------------------------------
/*
Scene.prototype.addTileAnimation = function(whichSheet, name, layer, row, col, startFrame, endFrame, loop, offsetX, offsetY){
	var animation = {
		name		:	name,
		layer		:	layer,
		row			:	row,
		col			:	col,
		startFrame	:	startFrame,
		endFrame	:	endFrame,
		loop		:	loop || false,
		offsetX		: 	offsetX	|| 0,
		offsetY		: 	offsetY	|| 0
	}
	
	whichSheet.animations.push(animation);
}

Scene.prototype.removeTileAnimation = function(whichSheet, row, col){
	var numAnimations = whichSheet.animations.length;
	var savedAnimations = [];
	for(var a=0;a<numAnimations;a++){
		if(whichSheet.animations[a].row == row && whichSheet.animations[a].col == col){
			//keep the animation
		}else{
			savedAnimations.push(whichSheet.animations[a]);
		}
	}
	whichSheet.animations = savedAnimations;
	savedAnimations = [];
}
*/
//------------------------------------------------------------------
//------------------------------------------------------------------
//END OLD TILE ANIMATION


//OLD DOM SETUP
//------------------------------------------------------------------
//------------------------------------------------------------------		
/*
//create game div
var htmlString  = '<div id="game">';
//create canvas
htmlString += '<canvas id="canvas" width='+win_width+' height=' +win_height+'></canvas>';
//create gui
htmlString += '<div id="gui"></div>'; 
//create glass
htmlString += '<div id="glass"></div>'; 
htmlString += '</div> ';
//end game
//add the game elements to the body
document.body.innerHTML = htmlString;
*/
//------------------------------------------------------------------
//------------------------------------------------------------------
//END DOM SETUP	


//OLD LIST HANDLERS
//------------------------------------------------------------------
//------------------------------------------------------------------
/*
FLAGENGINE.prototype.printMatrix = function(matrix){
	var string = "[";		
	for (var i = 0; i<matrix.length; i++){
		string += "[";
		for (var j = 0; j<matrix[0].length; j++){
			if(j == matrix[0].length -1){
				string += matrix[i][j];
			}else{
			string += matrix[i][j] + ",";
			}	
		};
		if(i == matrix.length -1){
			string += "]";
		}else{
			string += "],";	
	};};
	string += "]";
	return string;
}	

FLAGENGINE.prototype.listToMatrix = function(list,segLength) {
    var matrix = [], i, k;
    for (i = 0, k = -1; i < list.length; i++) {
       	if (i % segLength === 0) {
            k++;
            matrix[k] = [];
        }
        matrix[k].push(list[i]);
    }
   	return matrix;
}

FLAGENGINE.prototype.matrixToList = function(matrix) {
	var matrixLength = matrix.length;
	var segLength = matrix[0].length;
	var list = [];
	for(var i=0;i<matrixLength;i++){
		for(var j=0;j<segLength;j++){
			list.push(matrix[i][j]);
};};}; 

FLAGENGINE.prototype.Tile = function(row,col){
	return {row:row,col:col};	
}

FLAGSCENE.prototype.addLayer = function(){
	this.layers.push({
			tileIDs			:	this.makeTileArray(),
			tileSheetIDs	:	this.makeTileArray(),
			tiledObjectIDs	:	this.makeTileArray(),
			offset			:	{x:0,y:0},
			visible			:	true,
			drawTileBounds	:	{row:{first:0,last:0},col:{first:0,last:0}}
	});
}

//MAKE TILE ARRAY
//Builds an array, at the proper size, for a new layer
//------------------------------------------------------------------
FLAGSCENE.prototype.makeTileArray = function(){	
	var array = [];	
	var array_Seg = [];
	for (var i = 0; i<this.tilesHigh; i++){
		for (var j = 0; j<this.tilesWide; j++){
			array_Seg.push (0);
		}		
		array.push (array_Seg);
		array_Seg = [];
	}		
	return array;
}
//------------------------------------------------------------------
//END MAKE TILE ARRAY


//SCALING OF SPRITES
//------------------------------------------------------------------
FLAGENGINE.prototype.drawSprites = function(row,col,layer){
	var numOfSprites = this.Scene.sprites.length;
	for(s=0;s<numOfSprites;s++){
		if(row == this.Scene.sprites[s].tileOn.row && col == this.Scene.sprites[s].tileOn.col){
			if(this.Scene.sprites[s].layer == layer && this.Scene.sprites[s].gui == false && this.Scene.sprites[s].draw == true){
				
				var spritePos = {x:Math.floor(this.Scene.sprites[s].x), y:Math.floor(this.Scene.sprites[s].y)};
				
				//SPRITE DECAL DRAW -- back
				var numOfDecals = this.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(this.Scene.sprites[s].decals[d].front == false){
						var rect = this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].tileRects[this.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[s].decals[d].y)};
						this.Context.save();
						this.Context.scale(this.Scene.sprites[s].scale,this.Scene.sprites[s].scale);
						this.Context.translate(Math.floor(-spritePos.x + (point.x/this.Scene.sprites[s].scale) + ((rect.w/this.Scene.sprites[s].scale)/2)-(this.Scene.sprites[s].decals[d].x/this.Scene.sprites[s].scale)),Math.floor(-spritePos.y + (point.y/this.Scene.sprites[s].scale) + ((rect.h/this.Scene.sprites[s].scale)/2)-(this.Scene.sprites[s].decals[d].y/this.Scene.sprites[s].scale)));
						this.Context.globalAlpha = this.Scene.sprites[s].decals[d].alpha;
						this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
						this.Context.restore();
						this.Context.globalAlpha = 1;
					}
				}
				
				//SPRITE DRAW
				var rect = this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].tileRects[this.Scene.sprites[s].frame];	
				var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.y)};	
				this.Context.globalAlpha = this.Scene.sprites[s].alpha;	
				if(this.Scene.sprites[s].animation != null){
					var animationOffset = {x:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].animations[this.Scene.sprites[s].animation].offset.x), y:Math.floor(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].animations[this.Scene.sprites[s].animation].offset.y)};
					point.x += animationOffset.x;
					point.y += animationOffset.y;
				}
				
				this.Context.save();
				this.Context.scale(this.Scene.sprites[s].scale,this.Scene.sprites[s].scale);
				this.Context.translate(Math.floor(-spritePos.x + (point.x/this.Scene.sprites[s].scale) + ((rect.w/this.Scene.sprites[s].scale)/2)-(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.x/this.Scene.sprites[s].scale)),Math.floor(-spritePos.y + (point.y/this.Scene.sprites[s].scale) + ((rect.h/this.Scene.sprites[s].scale)/2)-(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].offset.y/this.Scene.sprites[s].scale)));
				this.Context.globalAlpha = this.Scene.sprites[s].alpha;
				this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
				this.Context.restore();
				this.Context.globalAlpha = 1;
				
				//SPRITE DECAL DRAW -- front
				var numOfDecals = this.Scene.sprites[s].decals.length;
				for(var d=0;d<numOfDecals;d++){
					if(this.Scene.sprites[s].decals[d].front == true){
						var rect = this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].tileRects[this.Scene.sprites[s].decals[d].frame];	
						var point = {x:Math.floor(spritePos.x-(rect.w/2)+this.Scene.sprites[s].decals[d].x), y:Math.floor(spritePos.y-(rect.h/2)+this.Scene.sprites[s].decals[d].y)};
						this.Context.save();
						this.Context.scale(this.Scene.sprites[s].scale,this.Scene.sprites[s].scale);
						this.Context.translate(Math.floor(-spritePos.x + (point.x/this.Scene.sprites[s].scale) + ((rect.w/this.Scene.sprites[s].scale)/2)-(this.Scene.sprites[s].decals[d].x/this.Scene.sprites[s].scale)),Math.floor(-spritePos.y + (point.y/this.Scene.sprites[s].scale) + ((rect.h/this.Scene.sprites[s].scale)/2)-(this.Scene.sprites[s].decals[d].y/this.Scene.sprites[s].scale)));
						this.Context.globalAlpha = this.Scene.sprites[s].decals[d].alpha;
						this.Context.drawImage(this.Scene.spriteSheets[this.Scene.sprites[s].decals[d].pIndex].image,rect.x,rect.y,rect.w,rect.h,point.x,point.y,rect.w,rect.h);
						this.Context.restore();
						this.Context.globalAlpha = 1;
					}
				}
			}
		}
	}
}
//------------------------------------------------------------------

*/
//------------------------------------------------------------------
//------------------------------------------------------------------
//END OLD LIST HANDLERS


//CONVEX SEPARATOR
//------------------------------------------------------------------

/*
 * Convex Separator for Box2D Web
 *
 * This is a port of an Actionscript class written by Antoan Angelov.
 * See http://www.emanueleferonato.com/2011/09/12/create-non-convex-complex-shapes-with-box2d/
 * It is designed to work with Erin Catto's Box2D physics library.

 */


(function() {
  var b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
  var b2Vec2 = Box2D.Common.Math.b2Vec2;
  var b2Body = Box2D.Dynamics.b2Body;
  var b2FixtureDef = Box2D.Dynamics.b2FixtureDef;

  /**
   * Separates a non-convex polygon into convex polygons and adds them as fixtures to the <code>body</code> parameter.<br/>
   * There are some rules you should follow (otherwise you might get unexpected results) :
   * <ul>
   * <li>This class is specifically for non-convex polygons. If you want to create a convex polygon, you don't need to use this class - Box2D's <code>b2PolygonShape</code> class allows you to create convex shapes with the <code>setAsArray()</code>/<code>setAsVector()</code> method.</li>
   * <li>The vertices must be in clockwise order.</li>
   * <li>No three neighbouring points should lie on the same line segment.</li>
   * <li>There must be no overlapping segments and no "holes".</li>
   * </ul> <p/>
   * @param body The b2Body, in which the new fixtures will be stored.
   * @param fixtureDef A b2FixtureDef, containing all the properties (friction, density, etc.) which the new fixtures will inherit.
   * @param verticesAry The vertices of the non-convex polygon, in clockwise order.
   * @param scale <code>[optional]</code> The scale which you use to draw shapes in Box2D. The bigger the scale, the better the precision. The default value is 30.
   * @see b2PolygonShape
   * @see b2PolygonShape.SetAsArray()
   * @see b2PolygonShape.SetAsVector()
   * @see b2Fixture
   * */

  var separate = function(body, fixtureDef, verticesAry, scale) {
      scale = scale != null ? scale : 30;
      var i, n = verticesAry.length,
        j, m;
      var vec = [],
        figsAry;
      var polyShape;

      for (i = 0; i < n; i++) {
        vec.push(new b2Vec2(verticesAry[i].x * scale, verticesAry[i].y * scale));
      }

      figsAry = calcShapes(vec);
      n = figsAry.length;

      for (i = 0; i < n; i++) {
        verticesAry = [];
        vec = figsAry[i];
        m = vec.length;
        for (j = 0; j < m; j++) {
          verticesAry.push(new b2Vec2(vec[j].x / scale, vec[j].y / scale));
        }

        polyShape = new b2PolygonShape;
        polyShape.SetAsVector(verticesAry);
        fixtureDef.shape = polyShape;
        body.CreateFixture(fixtureDef);
      }
    }

    /**
     * Checks whether the vertices in <code>verticesVec</code> can be properly distributed into the new fixtures (more specifically, it makes sure there are no overlapping segments and the vertices are in clockwise order).
     * It is recommended that you use this method for debugging only, because it may cost more CPU usage.
     * <p/>
     * @param verticesVec The vertices to be validated.
     * @return An integer which can have the following values:
     * <ul>
     * <li>0 if the vertices can be properly processed.</li>
     * <li>1 If there are overlapping lines.</li>
     * <li>2 if the points are <b>not</b> in clockwise order.</li>
     * <li>3 if there are overlapping lines <b>and</b> the points are <b>not</b> in clockwise order.</li>
     * </ul>
     * */
  var validate = function(verticesAry) {
      var i, n = verticesAry.length,
        j, j2, i2, i3, d, ret = 0;
      var fl, fl2 = false;

      for (i = 0; i < n; i++) {
        i2 = (i < n - 1) ? i + 1 : 0;
        i3 = (i > 0) ? i - 1 : n - 1;

        fl = false;
        for (j = 0; j < n; j++) {
          if (((j != i) && j != i2)) {
            if (!fl) {
              d = det(verticesAry[i].x, verticesAry[i].y, verticesAry[i2].x, verticesAry[i2].y, verticesAry[j].x, verticesAry[j].y);
              if ((d > 0)) {
                fl = true;
              }
            }

            if ((j != i3)) {
              j2 = (j < n - 1) ? j + 1 : 0;
              if (hitSegment(verticesAry[i].x, verticesAry[i].y, verticesAry[i2].x, verticesAry[i2].y, verticesAry[j].x, verticesAry[j].y, verticesAry[j2].x, verticesAry[j2].y)) {
                ret = 1;
              }
            }
          }
        }

        if (!fl) {
          fl2 = true;
        }
      }

      if (fl2) {
        if ((ret == 1)) {
          ret = 3;
        } else {
          ret = 2;
        }

      }
      return ret;
    }

  var calcShapes = function(verticesAry) {
      var vec;
      var i, n, j;
      var d, t, dx, dy, minLen;
      var i1, i2, i3, p1, p2, p3;
      var j1, j2, v1, v2, k, h;
      var vec1, vec2;
      var v, hitV;
      var isConvex;
      var figsAry = [],
        queue = [];

      queue.push(verticesAry);

      while (queue.length) {
        vec = queue[0];
        n = vec.length;
        isConvex = true;

        for (i = 0; i < n; i++) {
          i1 = i;
          i2 = (i < n - 1) ? i + 1 : i + 1 - n;
          i3 = (i < n - 2) ? i + 2 : i + 2 - n;

          p1 = vec[i1];
          p2 = vec[i2];
          p3 = vec[i3];

          d = det(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
          if ((d < 0)) {
            isConvex = false;
            minLen = Number.MAX_VALUE;

            for (j = 0; j < n; j++) {
              if (((j != i1) && j != i2)) {
                j1 = j;
                j2 = (j < n - 1) ? j + 1 : 0;

                v1 = vec[j1];
                v2 = vec[j2];

                v = hitRay(p1.x, p1.y, p2.x, p2.y, v1.x, v1.y, v2.x, v2.y);

                if (v) {
                  dx = p2.x - v.x;
                  dy = p2.y - v.y;
                  t = dx * dx + dy * dy;

                  if ((t < minLen)) {
                    h = j1;
                    k = j2;
                    hitV = v;
                    minLen = t;
                  }
                }
              }
            }

            if ((minLen == Number.MAX_VALUE)) {
              err();
            }

            vec1 = [];
            vec2 = [];

            j1 = h;
            j2 = k;
            v1 = vec[j1];
            v2 = vec[j2];

            if (!pointsMatch(hitV.x, hitV.y, v2.x, v2.y)) {
              vec1.push(hitV);
            }
            if (!pointsMatch(hitV.x, hitV.y, v1.x, v1.y)) {
              vec2.push(hitV);
            }

            h = -1;
            k = i1;
            while (true) {
              if ((k != j2)) {
                vec1.push(vec[k]);
              } else {
                if (((h < 0) || h >= n)) {
                  err();
                }
                if (!isOnSegment(v2.x, v2.y, vec[h].x, vec[h].y, p1.x, p1.y)) {
                  vec1.push(vec[k]);
                }
                break;
              }

              h = k;
              if (((k - 1) < 0)) {
                k = n - 1;
              } else {
                k--;
              }
            }

            vec1 = vec1.reverse();

            h = -1;
            k = i2;
            while (true) {
              if ((k != j1)) {
                vec2.push(vec[k]);
              } else {
                if (((h < 0) || h >= n)) {
                  err();
                }
                if (((k == j1) && !isOnSegment(v1.x, v1.y, vec[h].x, vec[h].y, p2.x, p2.y))) {
                  vec2.push(vec[k]);
                }
                break;
              }

              h = k;
              if (((k + 1) > n - 1)) {
                k = 0;
              } else {
                k++;
              }
            }

            queue.push(vec1, vec2);
            queue.shift();

            break;
          }
        }

        if (isConvex) {
          figsAry.push(queue.shift());
        }
      }

      return figsAry;
    }


  var hitRay = function(x1, y1, x2, y2, x3, y3, x4, y4) {
      var t1 = x3 - x1,
        t2 = y3 - y1,
        t3 = x2 - x1,
        t4 = y2 - y1,
        t5 = x4 - x3,
        t6 = y4 - y3,
        t7 = t4 * t5 - t3 * t6,
        a;

      a = (((t5 * t2) - t6 * t1) / t7);
      var px = x1 + a * t3,
        py = y1 + a * t4;
      var b1 = isOnSegment(x2, y2, x1, y1, px, py);
      var b2 = isOnSegment(px, py, x3, y3, x4, y4);

      if ((b1 && b2)) {
        return new b2Vec2(px, py);
      }

      return null;
    }

  var hitSegment = function(x1, y1, x2, y2, x3, y3, x4, y4) {
      var t1 = x3 - x1,
        t2 = y3 - y1,
        t3 = x2 - x1,
        t4 = y2 - y1,
        t5 = x4 - x3,
        t6 = y4 - y3,
        t7 = t4 * t5 - t3 * t6,
        a;

      a = (((t5 * t2) - t6 * t1) / t7);
      var px = x1 + a * t3,
        py = y1 + a * t4;
      var b1 = isOnSegment(px, py, x1, y1, x2, y2);
      var b2 = isOnSegment(px, py, x3, y3, x4, y4);

      if ((b1 && b2)) {
        return new b2Vec2(px, py);
      }

      return null;
    }

  var isOnSegment = function(px, py, x1, y1, x2, y2) {
      var b1 = ((((x1 + 0.1) >= px) && px >= x2 - 0.1) || (((x1 - 0.1) <= px) && px <= x2 + 0.1));
      var b2 = ((((y1 + 0.1) >= py) && py >= y2 - 0.1) || (((y1 - 0.1) <= py) && py <= y2 + 0.1));
      return ((b1 && b2) && isOnLine(px, py, x1, y1, x2, y2));
    }

  var pointsMatch = function(x1, y1, x2, y2) {
      var dx = (x2 >= x1) ? x2 - x1 : x1 - x2,
        dy = (y2 >= y1) ? y2 - y1 : y1 - y2;
      return ((dx < 0.1) && dy < 0.1);
    }

  var isOnLine = function(px, py, x1, y1, x2, y2) {
      if ((((x2 - x1) > 0.1) || x1 - x2 > 0.1)) {
        var a = (y2 - y1) / (x2 - x1),
          possibleY = a * (px - x1) + y1,
          diff = (possibleY > py) ? possibleY - py : py - possibleY;
        return (diff < 0.1);
      }

      return (((px - x1) < 0.1) || x1 - px < 0.1);
    }

  var det = function det(x1, y1, x2, y2, x3, y3) {
      return x1 * y2 + x2 * y3 + x3 * y1 - y1 * x2 - y2 * x3 - y3 * x1;
    }

  var err = function err() {
      throw new Error("A problem has occurred. Use the Validate() method to see where the problem is.");
    }

  this.Box2DSeparator = {
    separate: separate,
    validate: validate
  };
}).call(this);

//------------------------------------------------------------------
//------------------------------------------------------------------
//END CONVEX SEPARATOR




//GL-MATRIX 2.2.1
//matrix handling for WebGL
//------------------------------------------------------------------
//------------------------------------------------------------------


/**
 * @fileoverview gl-matrix - High performance matrix and vector operations
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 2.2.1
 */

/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


(function(_global) {
  "use strict";

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      // gl-matrix lives in a browser, define its namespaces in global
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    // gl-matrix lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }

  (function(exports) {
    /* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */


if(!GLMAT_EPSILON) {
    var GLMAT_EPSILON = 0.000001;
}

if(!GLMAT_ARRAY_TYPE) {
    var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
}

if(!GLMAT_RANDOM) {
    var GLMAT_RANDOM = Math.random;
}

/**
 * @class Common utilities
 * @name glMatrix
 */
var glMatrix = {};

/**
 * Sets the type of array used when creating new vectors and matricies
 *
 * @param {Type} type Array type, such as Float32Array or Array
 */
glMatrix.setMatrixArrayType = function(type) {
    GLMAT_ARRAY_TYPE = type;
}

if(typeof(exports) !== 'undefined') {
    exports.glMatrix = glMatrix;
}

var degree = Math.PI / 180;

/**
* Convert Degree To Radian
*
* @param {Number} Angle in Degrees
*/
glMatrix.toRadian = function(a){
     return a * degree;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

var vec2 = {};

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */
vec2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = 0;
    out[1] = 0;
    return out;
};

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param {vec2} a vector to clone
 * @returns {vec2} a new 2D vector
 */
vec2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} a new 2D vector
 */
vec2.fromValues = function(x, y) {
    var out = new GLMAT_ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Copy the values from one vec2 to another
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the source vector
 * @returns {vec2} out
 */
vec2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
};

/**
 * Set the components of a vec2 to the given values
 *
 * @param {vec2} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @returns {vec2} out
 */
vec2.set = function(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
};

/**
 * Adds two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
};

/**
 * Alias for {@link vec2.subtract}
 * @function
 */
vec2.sub = vec2.subtract;

/**
 * Multiplies two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
};

/**
 * Alias for {@link vec2.multiply}
 * @function
 */
vec2.mul = vec2.multiply;

/**
 * Divides two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
};

/**
 * Alias for {@link vec2.divide}
 * @function
 */
vec2.div = vec2.divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
};

/**
 * Returns the maximum of two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec2} out
 */
vec2.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
};

/**
 * Scales a vec2 by a scalar number
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec2} out
 */
vec2.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
};

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec2} out
 */
vec2.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} distance between a and b
 */
vec2.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.distance}
 * @function
 */
vec2.dist = vec2.distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec2.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredDistance}
 * @function
 */
vec2.sqrDist = vec2.squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param {vec2} a vector to calculate length of
 * @returns {Number} length of a
 */
vec2.length = function (a) {
    var x = a[0],
        y = a[1];
    return Math.sqrt(x*x + y*y);
};

/**
 * Alias for {@link vec2.length}
 * @function
 */
vec2.len = vec2.length;

/**
 * Calculates the squared length of a vec2
 *
 * @param {vec2} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec2.squaredLength = function (a) {
    var x = a[0],
        y = a[1];
    return x*x + y*y;
};

/**
 * Alias for {@link vec2.squaredLength}
 * @function
 */
vec2.sqrLen = vec2.squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to negate
 * @returns {vec2} out
 */
vec2.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
};

/**
 * Normalize a vec2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a vector to normalize
 * @returns {vec2} out
 */
vec2.normalize = function(out, a) {
    var x = a[0],
        y = a[1];
    var len = x*x + y*y;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec2's
 *
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {Number} dot product of a and b
 */
vec2.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1];
};

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param {vec3} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @returns {vec3} out
 */
vec2.cross = function(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
};

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the first operand
 * @param {vec2} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec2} out
 */
vec2.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec2} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec2} out
 */
vec2.random = function (out, scale) {
    scale = scale || 1.0;
    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    out[0] = Math.cos(r) * scale;
    out[1] = Math.sin(r) * scale;
    return out;
};

/**
 * Transforms the vec2 with a mat2
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
};

/**
 * Transforms the vec2 with a mat2d
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat2d} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat2d = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
};

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat3} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat3 = function(out, a, m) {
    var x = a[0],
        y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
};

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param {vec2} out the receiving vector
 * @param {vec2} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec2} out
 */
vec2.transformMat4 = function(out, a, m) {
    var x = a[0], 
        y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
};

/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec2.forEach = (function() {
    var vec = vec2.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 2;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec2} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec2.str = function (a) {
    return 'vec2(' + a[0] + ', ' + a[1] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec2 = vec2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3 Dimensional Vector
 * @name vec3
 */

var vec3 = {};

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
vec3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
};

/**
 * Creates a new vec3 initialized with values from an existing vector
 *
 * @param {vec3} a vector to clone
 * @returns {vec3} a new 3D vector
 */
vec3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
vec3.fromValues = function(x, y, z) {
    var out = new GLMAT_ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Copy the values from one vec3 to another
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the source vector
 * @returns {vec3} out
 */
vec3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
};

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
vec3.set = function(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
};

/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
};

/**
 * Alias for {@link vec3.subtract}
 * @function
 */
vec3.sub = vec3.subtract;

/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
};

/**
 * Alias for {@link vec3.multiply}
 * @function
 */
vec3.mul = vec3.multiply;

/**
 * Divides two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
};

/**
 * Alias for {@link vec3.divide}
 * @function
 */
vec3.div = vec3.divide;

/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
};

/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
};

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
vec3.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
};

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
vec3.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} distance between a and b
 */
vec3.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.distance}
 * @function
 */
vec3.dist = vec3.distance;

/**
 * Calculates the squared euclidian distance between two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec3.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredDistance}
 * @function
 */
vec3.sqrDist = vec3.squaredDistance;

/**
 * Calculates the length of a vec3
 *
 * @param {vec3} a vector to calculate length of
 * @returns {Number} length of a
 */
vec3.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return Math.sqrt(x*x + y*y + z*z);
};

/**
 * Alias for {@link vec3.length}
 * @function
 */
vec3.len = vec3.length;

/**
 * Calculates the squared length of a vec3
 *
 * @param {vec3} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec3.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    return x*x + y*y + z*z;
};

/**
 * Alias for {@link vec3.squaredLength}
 * @function
 */
vec3.sqrLen = vec3.squaredLength;

/**
 * Negates the components of a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to negate
 * @returns {vec3} out
 */
vec3.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
};

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a vector to normalize
 * @returns {vec3} out
 */
vec3.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2];
    var len = x*x + y*y + z*z;
    if (len > 0) {
        //TODO: evaluate use of glm_invsqrt here?
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec3's
 *
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {Number} dot product of a and b
 */
vec3.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
};

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @returns {vec3} out
 */
vec3.cross = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2],
        bx = b[0], by = b[1], bz = b[2];

    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
};

/**
 * Performs a linear interpolation between two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the first operand
 * @param {vec3} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec3} out
 */
vec3.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec3} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec3} out
 */
vec3.random = function (out, scale) {
    scale = scale || 1.0;

    var r = GLMAT_RANDOM() * 2.0 * Math.PI;
    var z = (GLMAT_RANDOM() * 2.0) - 1.0;
    var zScale = Math.sqrt(1.0-z*z) * scale;

    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale;
    return out;
};

/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
};

/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {mat4} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */
vec3.transformMat3 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
};

/**
 * Transforms the vec3 with a quat
 *
 * @param {vec3} out the receiving vector
 * @param {vec3} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec3} out
 */
vec3.transformQuat = function(out, a, q) {
    // benchmarks: http://jsperf.com/quaternion-transform-vec3-implementations

    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/*
* Rotate a 3D vector around the x-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateX = function(out, a, b, c){
   var p = [], r=[];
	  //Translate point to the origin
	  p[0] = a[0] - b[0];
	  p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];

	  //perform rotation
	  r[0] = p[0];
	  r[1] = p[1]*Math.cos(c) - p[2]*Math.sin(c);
	  r[2] = p[1]*Math.sin(c) + p[2]*Math.cos(c);

	  //translate to correct position
	  out[0] = r[0] + b[0];
	  out[1] = r[1] + b[1];
	  out[2] = r[2] + b[2];

  	return out;
};

/*
* Rotate a 3D vector around the y-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateY = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[2]*Math.sin(c) + p[0]*Math.cos(c);
  	r[1] = p[1];
  	r[2] = p[2]*Math.cos(c) - p[0]*Math.sin(c);
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/*
* Rotate a 3D vector around the z-axis
* @param {vec3} out The receiving vec3
* @param {vec3} a The vec3 point to rotate
* @param {vec3} b The origin of the rotation
* @param {Number} c The angle of rotation
* @returns {vec3} out
*/
vec3.rotateZ = function(out, a, b, c){
  	var p = [], r=[];
  	//Translate point to the origin
  	p[0] = a[0] - b[0];
  	p[1] = a[1] - b[1];
  	p[2] = a[2] - b[2];
  
  	//perform rotation
  	r[0] = p[0]*Math.cos(c) - p[1]*Math.sin(c);
  	r[1] = p[0]*Math.sin(c) + p[1]*Math.cos(c);
  	r[2] = p[2];
  
  	//translate to correct position
  	out[0] = r[0] + b[0];
  	out[1] = r[1] + b[1];
  	out[2] = r[2] + b[2];
  
  	return out;
};

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec3.forEach = (function() {
    var vec = vec3.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 3;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec3} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec3.str = function (a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec3 = vec3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4 Dimensional Vector
 * @name vec4
 */

var vec4 = {};

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
vec4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
};

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param {vec4} a vector to clone
 * @returns {vec4} a new 4D vector
 */
vec4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} a new 4D vector
 */
vec4.fromValues = function(x, y, z, w) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Copy the values from one vec4 to another
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the source vector
 * @returns {vec4} out
 */
vec4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set the components of a vec4 to the given values
 *
 * @param {vec4} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {vec4} out
 */
vec4.set = function(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
};

/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.add = function(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
};

/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.subtract = function(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
};

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
vec4.sub = vec4.subtract;

/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.multiply = function(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
};

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
vec4.mul = vec4.multiply;

/**
 * Divides two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.divide = function(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
};

/**
 * Alias for {@link vec4.divide}
 * @function
 */
vec4.div = vec4.divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.min = function(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
};

/**
 * Returns the maximum of two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {vec4} out
 */
vec4.max = function(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
};

/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */
vec4.scale = function(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
};

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec4} out
 */
vec4.scaleAndAdd = function(out, a, b, scale) {
    out[0] = a[0] + (b[0] * scale);
    out[1] = a[1] + (b[1] * scale);
    out[2] = a[2] + (b[2] * scale);
    out[3] = a[3] + (b[3] * scale);
    return out;
};

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} distance between a and b
 */
vec4.distance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.distance}
 * @function
 */
vec4.dist = vec4.distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} squared distance between a and b
 */
vec4.squaredDistance = function(a, b) {
    var x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        w = b[3] - a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
vec4.sqrDist = vec4.squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param {vec4} a vector to calculate length of
 * @returns {Number} length of a
 */
vec4.length = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return Math.sqrt(x*x + y*y + z*z + w*w);
};

/**
 * Alias for {@link vec4.length}
 * @function
 */
vec4.len = vec4.length;

/**
 * Calculates the squared length of a vec4
 *
 * @param {vec4} a vector to calculate squared length of
 * @returns {Number} squared length of a
 */
vec4.squaredLength = function (a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    return x*x + y*y + z*z + w*w;
};

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
vec4.sqrLen = vec4.squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to negate
 * @returns {vec4} out
 */
vec4.negate = function(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
};

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a vector to normalize
 * @returns {vec4} out
 */
vec4.normalize = function(out, a) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    var len = x*x + y*y + z*z + w*w;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        out[0] = a[0] * len;
        out[1] = a[1] * len;
        out[2] = a[2] * len;
        out[3] = a[3] * len;
    }
    return out;
};

/**
 * Calculates the dot product of two vec4's
 *
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @returns {Number} dot product of a and b
 */
vec4.dot = function (a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
};

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the first operand
 * @param {vec4} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {vec4} out
 */
vec4.lerp = function (out, a, b, t) {
    var ax = a[0],
        ay = a[1],
        az = a[2],
        aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
};

/**
 * Generates a random vector with the given scale
 *
 * @param {vec4} out the receiving vector
 * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns {vec4} out
 */
vec4.random = function (out, scale) {
    scale = scale || 1.0;

    //TODO: This is a pretty awful way of doing this. Find something better.
    out[0] = GLMAT_RANDOM();
    out[1] = GLMAT_RANDOM();
    out[2] = GLMAT_RANDOM();
    out[3] = GLMAT_RANDOM();
    vec4.normalize(out, out);
    vec4.scale(out, out, scale);
    return out;
};

/**
 * Transforms the vec4 with a mat4.
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns {vec4} out
 */
vec4.transformMat4 = function(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
};

/**
 * Transforms the vec4 with a quat
 *
 * @param {vec4} out the receiving vector
 * @param {vec4} a the vector to transform
 * @param {quat} q quaternion to transform with
 * @returns {vec4} out
 */
vec4.transformQuat = function(out, a, q) {
    var x = a[0], y = a[1], z = a[2],
        qx = q[0], qy = q[1], qz = q[2], qw = q[3],

        // calculate quat * vec
        ix = qw * x + qy * z - qz * y,
        iy = qw * y + qz * x - qx * z,
        iz = qw * z + qx * y - qy * x,
        iw = -qx * x - qy * y - qz * z;

    // calculate result * inverse quat
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return out;
};

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
vec4.forEach = (function() {
    var vec = vec4.create();

    return function(a, stride, offset, count, fn, arg) {
        var i, l;
        if(!stride) {
            stride = 4;
        }

        if(!offset) {
            offset = 0;
        }
        
        if(count) {
            l = Math.min((count * stride) + offset, a.length);
        } else {
            l = a.length;
        }

        for(i = offset; i < l; i += stride) {
            vec[0] = a[i]; vec[1] = a[i+1]; vec[2] = a[i+2]; vec[3] = a[i+3];
            fn(vec, vec, arg);
            a[i] = vec[0]; a[i+1] = vec[1]; a[i+2] = vec[2]; a[i+3] = vec[3];
        }
        
        return a;
    };
})();

/**
 * Returns a string representation of a vector
 *
 * @param {vec4} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
vec4.str = function (a) {
    return 'vec4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.vec4 = vec4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x2 Matrix
 * @name mat2
 */

var mat2 = {};

/**
 * Creates a new identity mat2
 *
 * @returns {mat2} a new 2x2 matrix
 */
mat2.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Creates a new mat2 initialized with values from an existing matrix
 *
 * @param {mat2} a matrix to clone
 * @returns {mat2} a new 2x2 matrix
 */
mat2.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Copy the values from one mat2 to another
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
};

/**
 * Set a mat2 to the identity matrix
 *
 * @param {mat2} out the receiving matrix
 * @returns {mat2} out
 */
mat2.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Transpose the values of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a1 = a[1];
        out[1] = a[2];
        out[2] = a1;
    } else {
        out[0] = a[0];
        out[1] = a[2];
        out[2] = a[1];
        out[3] = a[3];
    }
    
    return out;
};

/**
 * Inverts a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],

        // Calculate the determinant
        det = a0 * a3 - a2 * a1;

    if (!det) {
        return null;
    }
    det = 1.0 / det;
    
    out[0] =  a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] =  a0 * det;

    return out;
};

/**
 * Calculates the adjugate of a mat2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the source matrix
 * @returns {mat2} out
 */
mat2.adjoint = function(out, a) {
    // Caching this value is nessecary if out == a
    var a0 = a[0];
    out[0] =  a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] =  a0;

    return out;
};

/**
 * Calculates the determinant of a mat2
 *
 * @param {mat2} a the source matrix
 * @returns {Number} determinant of a
 */
mat2.determinant = function (a) {
    return a[0] * a[3] - a[2] * a[1];
};

/**
 * Multiplies two mat2's
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the first operand
 * @param {mat2} b the second operand
 * @returns {mat2} out
 */
mat2.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
};

/**
 * Alias for {@link mat2.multiply}
 * @function
 */
mat2.mul = mat2.multiply;

/**
 * Rotates a mat2 by the given angle
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2} out
 */
mat2.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
};

/**
 * Scales the mat2 by the dimensions in the given vec2
 *
 * @param {mat2} out the receiving matrix
 * @param {mat2} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2} out
 **/
mat2.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
};

/**
 * Returns a string representation of a mat2
 *
 * @param {mat2} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2.str = function (a) {
    return 'mat2(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

/**
 * Returns Frobenius norm of a mat2
 *
 * @param {mat2} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2)))
};

/**
 * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
 * @param {mat2} L the lower triangular matrix 
 * @param {mat2} D the diagonal matrix 
 * @param {mat2} U the upper triangular matrix 
 * @param {mat2} a the input matrix to factorize
 */

mat2.LDU = function (L, D, U, a) { 
    L[2] = a[2]/a[0]; 
    U[0] = a[0]; 
    U[1] = a[1]; 
    U[3] = a[3] - L[2] * U[1]; 
    return [L, D, U];       
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2 = mat2;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 2x3 Matrix
 * @name mat2d
 * 
 * @description 
 * A mat2d contains six elements defined as:
 * <pre>
 * [a, c, tx,
 *  b, d, ty]
 * </pre>
 * This is a short form for the 3x3 matrix:
 * <pre>
 * [a, c, tx,
 *  b, d, ty,
 *  0, 0, 1]
 * </pre>
 * The last row is ignored so the array is shorter and operations are faster.
 */

var mat2d = {};

/**
 * Creates a new identity mat2d
 *
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.create = function() {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Creates a new mat2d initialized with values from an existing matrix
 *
 * @param {mat2d} a matrix to clone
 * @returns {mat2d} a new 2x3 matrix
 */
mat2d.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Copy the values from one mat2d to another
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
};

/**
 * Set a mat2d to the identity matrix
 *
 * @param {mat2d} out the receiving matrix
 * @returns {mat2d} out
 */
mat2d.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
};

/**
 * Inverts a mat2d
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the source matrix
 * @returns {mat2d} out
 */
mat2d.invert = function(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3],
        atx = a[4], aty = a[5];

    var det = aa * ad - ab * ac;
    if(!det){
        return null;
    }
    det = 1.0 / det;

    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
};

/**
 * Calculates the determinant of a mat2d
 *
 * @param {mat2d} a the source matrix
 * @returns {Number} determinant of a
 */
mat2d.determinant = function (a) {
    return a[0] * a[3] - a[1] * a[2];
};

/**
 * Multiplies two mat2d's
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the first operand
 * @param {mat2d} b the second operand
 * @returns {mat2d} out
 */
mat2d.multiply = function (out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
};

/**
 * Alias for {@link mat2d.multiply}
 * @function
 */
mat2d.mul = mat2d.multiply;


/**
 * Rotates a mat2d by the given angle
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat2d} out
 */
mat2d.rotate = function (out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        s = Math.sin(rad),
        c = Math.cos(rad);
    out[0] = a0 *  c + a2 * s;
    out[1] = a1 *  c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Scales the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat2d} out
 **/
mat2d.scale = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
};

/**
 * Translates the mat2d by the dimensions in the given vec2
 *
 * @param {mat2d} out the receiving matrix
 * @param {mat2d} a the matrix to translate
 * @param {vec2} v the vec2 to translate the matrix by
 * @returns {mat2d} out
 **/
mat2d.translate = function(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5],
        v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
};

/**
 * Returns a string representation of a mat2d
 *
 * @param {mat2d} a matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat2d.str = function (a) {
    return 'mat2d(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ')';
};

/**
 * Returns Frobenius norm of a mat2d
 *
 * @param {mat2d} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat2d.frob = function (a) { 
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + 1))
}; 

if(typeof(exports) !== 'undefined') {
    exports.mat2d = mat2d;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 3x3 Matrix
 * @name mat3
 */

var mat3 = {};

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
mat3.create = function() {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {mat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */
mat3.fromMat4 = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
};

/**
 * Creates a new mat3 initialized with values from an existing matrix
 *
 * @param {mat3} a matrix to clone
 * @returns {mat3} a new 3x3 matrix
 */
mat3.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copy the values from one mat3 to another
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Set a mat3 to the identity matrix
 *
 * @param {mat3} out the receiving matrix
 * @returns {mat3} out
 */
mat3.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
};

/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a12 = a[5];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a01;
        out[5] = a[7];
        out[6] = a02;
        out[7] = a12;
    } else {
        out[0] = a[0];
        out[1] = a[3];
        out[2] = a[6];
        out[3] = a[1];
        out[4] = a[4];
        out[5] = a[7];
        out[6] = a[2];
        out[7] = a[5];
        out[8] = a[8];
    }
    
    return out;
};

/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,

        // Calculate the determinant
        det = a00 * b01 + a01 * b11 + a02 * b21;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
};

/**
 * Calculates the adjugate of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the source matrix
 * @returns {mat3} out
 */
mat3.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    out[0] = (a11 * a22 - a12 * a21);
    out[1] = (a02 * a21 - a01 * a22);
    out[2] = (a01 * a12 - a02 * a11);
    out[3] = (a12 * a20 - a10 * a22);
    out[4] = (a00 * a22 - a02 * a20);
    out[5] = (a02 * a10 - a00 * a12);
    out[6] = (a10 * a21 - a11 * a20);
    out[7] = (a01 * a20 - a00 * a21);
    out[8] = (a00 * a11 - a01 * a10);
    return out;
};

/**
 * Calculates the determinant of a mat3
 *
 * @param {mat3} a the source matrix
 * @returns {Number} determinant of a
 */
mat3.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8];

    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
};

/**
 * Multiplies two mat3's
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the first operand
 * @param {mat3} b the second operand
 * @returns {mat3} out
 */
mat3.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        b00 = b[0], b01 = b[1], b02 = b[2],
        b10 = b[3], b11 = b[4], b12 = b[5],
        b20 = b[6], b21 = b[7], b22 = b[8];

    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;

    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;

    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
};

/**
 * Alias for {@link mat3.multiply}
 * @function
 */
mat3.mul = mat3.multiply;

/**
 * Translate a mat3 by the given vector
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to translate
 * @param {vec2} v vector to translate by
 * @returns {mat3} out
 */
mat3.translate = function(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],
        x = v[0], y = v[1];

    out[0] = a00;
    out[1] = a01;
    out[2] = a02;

    out[3] = a10;
    out[4] = a11;
    out[5] = a12;

    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
};

/**
 * Rotates a mat3 by the given angle
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat3} out
 */
mat3.rotate = function (out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2],
        a10 = a[3], a11 = a[4], a12 = a[5],
        a20 = a[6], a21 = a[7], a22 = a[8],

        s = Math.sin(rad),
        c = Math.cos(rad);

    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;

    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;

    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
};

/**
 * Scales the mat3 by the dimensions in the given vec2
 *
 * @param {mat3} out the receiving matrix
 * @param {mat3} a the matrix to rotate
 * @param {vec2} v the vec2 to scale the matrix by
 * @returns {mat3} out
 **/
mat3.scale = function(out, a, v) {
    var x = v[0], y = v[1];

    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];

    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];

    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
};

/**
 * Copies the values from a mat2d into a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {mat2d} a the matrix to copy
 * @returns {mat3} out
 **/
mat3.fromMat2d = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;

    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;

    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
};

/**
* Calculates a 3x3 matrix from the given quaternion
*
* @param {mat3} out mat3 receiving operation result
* @param {quat} q Quaternion to create matrix from
*
* @returns {mat3} out
*/
mat3.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;

    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;

    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;

    return out;
};

/**
* Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
*
* @param {mat3} out mat3 receiving operation result
* @param {mat4} a Mat4 to derive the normal matrix from
*
* @returns {mat3} out
*/
mat3.normalFromMat4 = function (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;

    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;

    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;

    return out;
};

/**
 * Returns a string representation of a mat3
 *
 * @param {mat3} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat3.str = function (a) {
    return 'mat3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + 
                    a[3] + ', ' + a[4] + ', ' + a[5] + ', ' + 
                    a[6] + ', ' + a[7] + ', ' + a[8] + ')';
};

/**
 * Returns Frobenius norm of a mat3
 *
 * @param {mat3} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat3.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2)))
};


if(typeof(exports) !== 'undefined') {
    exports.mat3 = mat3;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class 4x4 Matrix
 * @name mat4
 */

var mat4 = {};

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
mat4.create = function() {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {mat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */
mat4.clone = function(a) {
    var out = new GLMAT_ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Copy the values from one mat4 to another
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.copy = function(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */
mat4.identity = function(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
};

/**
 * Transpose the values of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.transpose = function(out, a) {
    // If we are transposing ourselves we can skip a few steps but have to cache some values
    if (out === a) {
        var a01 = a[1], a02 = a[2], a03 = a[3],
            a12 = a[6], a13 = a[7],
            a23 = a[11];

        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a01;
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a02;
        out[9] = a12;
        out[11] = a[14];
        out[12] = a03;
        out[13] = a13;
        out[14] = a23;
    } else {
        out[0] = a[0];
        out[1] = a[4];
        out[2] = a[8];
        out[3] = a[12];
        out[4] = a[1];
        out[5] = a[5];
        out[6] = a[9];
        out[7] = a[13];
        out[8] = a[2];
        out[9] = a[6];
        out[10] = a[10];
        out[11] = a[14];
        out[12] = a[3];
        out[13] = a[7];
        out[14] = a[11];
        out[15] = a[15];
    }
    
    return out;
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.invert = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) { 
        return null; 
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
};

/**
 * Calculates the adjugate of a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the source matrix
 * @returns {mat4} out
 */
mat4.adjoint = function(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    out[0]  =  (a11 * (a22 * a33 - a23 * a32) - a21 * (a12 * a33 - a13 * a32) + a31 * (a12 * a23 - a13 * a22));
    out[1]  = -(a01 * (a22 * a33 - a23 * a32) - a21 * (a02 * a33 - a03 * a32) + a31 * (a02 * a23 - a03 * a22));
    out[2]  =  (a01 * (a12 * a33 - a13 * a32) - a11 * (a02 * a33 - a03 * a32) + a31 * (a02 * a13 - a03 * a12));
    out[3]  = -(a01 * (a12 * a23 - a13 * a22) - a11 * (a02 * a23 - a03 * a22) + a21 * (a02 * a13 - a03 * a12));
    out[4]  = -(a10 * (a22 * a33 - a23 * a32) - a20 * (a12 * a33 - a13 * a32) + a30 * (a12 * a23 - a13 * a22));
    out[5]  =  (a00 * (a22 * a33 - a23 * a32) - a20 * (a02 * a33 - a03 * a32) + a30 * (a02 * a23 - a03 * a22));
    out[6]  = -(a00 * (a12 * a33 - a13 * a32) - a10 * (a02 * a33 - a03 * a32) + a30 * (a02 * a13 - a03 * a12));
    out[7]  =  (a00 * (a12 * a23 - a13 * a22) - a10 * (a02 * a23 - a03 * a22) + a20 * (a02 * a13 - a03 * a12));
    out[8]  =  (a10 * (a21 * a33 - a23 * a31) - a20 * (a11 * a33 - a13 * a31) + a30 * (a11 * a23 - a13 * a21));
    out[9]  = -(a00 * (a21 * a33 - a23 * a31) - a20 * (a01 * a33 - a03 * a31) + a30 * (a01 * a23 - a03 * a21));
    out[10] =  (a00 * (a11 * a33 - a13 * a31) - a10 * (a01 * a33 - a03 * a31) + a30 * (a01 * a13 - a03 * a11));
    out[11] = -(a00 * (a11 * a23 - a13 * a21) - a10 * (a01 * a23 - a03 * a21) + a20 * (a01 * a13 - a03 * a11));
    out[12] = -(a10 * (a21 * a32 - a22 * a31) - a20 * (a11 * a32 - a12 * a31) + a30 * (a11 * a22 - a12 * a21));
    out[13] =  (a00 * (a21 * a32 - a22 * a31) - a20 * (a01 * a32 - a02 * a31) + a30 * (a01 * a22 - a02 * a21));
    out[14] = -(a00 * (a11 * a32 - a12 * a31) - a10 * (a01 * a32 - a02 * a31) + a30 * (a01 * a12 - a02 * a11));
    out[15] =  (a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11));
    return out;
};

/**
 * Calculates the determinant of a mat4
 *
 * @param {mat4} a the source matrix
 * @returns {Number} determinant of a
 */
mat4.determinant = function (a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32;

    // Calculate the determinant
    return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
};

/**
 * Multiplies two mat4's
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the first operand
 * @param {mat4} b the second operand
 * @returns {mat4} out
 */
mat4.multiply = function (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    // Cache only the current line of the second matrix
    var b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
    out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
    return out;
};

/**
 * Alias for {@link mat4.multiply}
 * @function
 */
mat4.mul = mat4.multiply;

/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to translate
 * @param {vec3} v vector to translate by
 * @returns {mat4} out
 */
mat4.translate = function (out, a, v) {
    var x = v[0], y = v[1], z = v[2],
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23;

    if (a === out) {
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
        a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
        a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
        a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

        out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
        out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
        out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;

        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
};

/**
 * Scales the mat4 by the dimensions in the given vec3
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to scale
 * @param {vec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/
mat4.scale = function(out, a, v) {
    var x = v[0], y = v[1], z = v[2];

    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
};

/**
 * Rotates a mat4 by the given angle
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {vec3} axis the axis to rotate around
 * @returns {mat4} out
 */
mat4.rotate = function (out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2],
        len = Math.sqrt(x * x + y * y + z * z),
        s, c, t,
        a00, a01, a02, a03,
        a10, a11, a12, a13,
        a20, a21, a22, a23,
        b00, b01, b02,
        b10, b11, b12,
        b20, b21, b22;

    if (Math.abs(len) < GLMAT_EPSILON) { return null; }
    
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
    b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
    b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }
    return out;
};

/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateX = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[0]  = a[0];
        out[1]  = a[1];
        out[2]  = a[2];
        out[3]  = a[3];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateY = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a20 = a[8],
        a21 = a[9],
        a22 = a[10],
        a23 = a[11];

    if (a !== out) { // If the source and destination differ, copy the unchanged rows
        out[4]  = a[4];
        out[5]  = a[5];
        out[6]  = a[6];
        out[7]  = a[7];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
};

/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {mat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */
mat4.rotateZ = function (out, a, rad) {
    var s = Math.sin(rad),
        c = Math.cos(rad),
        a00 = a[0],
        a01 = a[1],
        a02 = a[2],
        a03 = a[3],
        a10 = a[4],
        a11 = a[5],
        a12 = a[6],
        a13 = a[7];

    if (a !== out) { // If the source and destination differ, copy the unchanged last row
        out[8]  = a[8];
        out[9]  = a[9];
        out[10] = a[10];
        out[11] = a[11];
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
    }

    // Perform axis-specific matrix multiplication
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
};

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     var quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {vec3} v Translation vector
 * @returns {mat4} out
 */
mat4.fromRotationTranslation = function (out, q, v) {
    // Quaternion math
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        xy = x * y2,
        xz = x * z2,
        yy = y * y2,
        yz = y * z2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    
    return out;
};

mat4.fromQuat = function (out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3],
        x2 = x + x,
        y2 = y + y,
        z2 = z + z,

        xx = x * x2,
        yx = y * x2,
        yy = y * y2,
        zx = z * x2,
        zy = z * y2,
        zz = z * z2,
        wx = w * x2,
        wy = w * y2,
        wz = w * z2;

    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;

    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;

    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
};

/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.frustum = function (out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left),
        tb = 1 / (top - bottom),
        nf = 1 / (near - far);
    out[0] = (near * 2) * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = (near * 2) * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (far * near * 2) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a perspective projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.perspective = function (out, fovy, aspect, near, far) {
    var f = 1.0 / Math.tan(fovy / 2),
        nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
};

/**
 * Generates a orthogonal projection matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */
mat4.ortho = function (out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right),
        bt = 1 / (bottom - top),
        nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
};

/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {vec3} eye Position of the viewer
 * @param {vec3} center Point the viewer is looking at
 * @param {vec3} up vec3 pointing up
 * @returns {mat4} out
 */
mat4.lookAt = function (out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
        eyex = eye[0],
        eyey = eye[1],
        eyez = eye[2],
        upx = up[0],
        upy = up[1],
        upz = up[2],
        centerx = center[0],
        centery = center[1],
        centerz = center[2];

    if (Math.abs(eyex - centerx) < GLMAT_EPSILON &&
        Math.abs(eyey - centery) < GLMAT_EPSILON &&
        Math.abs(eyez - centerz) < GLMAT_EPSILON) {
        return mat4.identity(out);
    }

    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;

    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;

    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
        x0 = 0;
        x1 = 0;
        x2 = 0;
    } else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
    }

    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;

    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
        y0 = 0;
        y1 = 0;
        y2 = 0;
    } else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
    }

    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;

    return out;
};

/**
 * Returns a string representation of a mat4
 *
 * @param {mat4} mat matrix to represent as a string
 * @returns {String} string representation of the matrix
 */
mat4.str = function (a) {
    return 'mat4(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ', ' +
                    a[4] + ', ' + a[5] + ', ' + a[6] + ', ' + a[7] + ', ' +
                    a[8] + ', ' + a[9] + ', ' + a[10] + ', ' + a[11] + ', ' + 
                    a[12] + ', ' + a[13] + ', ' + a[14] + ', ' + a[15] + ')';
};

/**
 * Returns Frobenius norm of a mat4
 *
 * @param {mat4} a the matrix to calculate Frobenius norm of
 * @returns {Number} Frobenius norm
 */
mat4.frob = function (a) {
    return(Math.sqrt(Math.pow(a[0], 2) + Math.pow(a[1], 2) + Math.pow(a[2], 2) + Math.pow(a[3], 2) + Math.pow(a[4], 2) + Math.pow(a[5], 2) + Math.pow(a[6], 2) + Math.pow(a[6], 2) + Math.pow(a[7], 2) + Math.pow(a[8], 2) + Math.pow(a[9], 2) + Math.pow(a[10], 2) + Math.pow(a[11], 2) + Math.pow(a[12], 2) + Math.pow(a[13], 2) + Math.pow(a[14], 2) + Math.pow(a[15], 2) ))
};


if(typeof(exports) !== 'undefined') {
    exports.mat4 = mat4;
}
;
/* Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

/**
 * @class Quaternion
 * @name quat
 */

var quat = {};

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {vec3} a the initial vector
 * @param {vec3} b the destination vector
 * @returns {quat} out
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(out, a, b) {
        var dot = vec3.dot(a, b);
        if (dot < -0.999999) {
            vec3.cross(tmpvec3, xUnitVec3, a);
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(tmpvec3, yUnitVec3, a);
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(out, tmpvec3, Math.PI);
            return out;
        } else if (dot > 0.999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(tmpvec3, a, b);
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {vec3} view  the vector representing the viewing direction
 * @param {vec3} right the vector representing the local "right" direction
 * @param {vec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(out, view, right, up) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(out, quat.fromMat3(out, matr));
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {quat} a quaternion to clone
 * @returns {quat} a new quaternion
 * @function
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} a new quaternion
 * @function
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the source quaternion
 * @returns {quat} out
 * @function
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {quat} out the receiving quaternion
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {quat} out
 * @function
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
quat.setAxisAngle = function(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 * @function
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {quat} out
 */
quat.multiply = function(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {quat} out the receiving vector
 * @param {quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {quat} out
 * @function
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateX = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateY = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {quat} out quat receiving operation result
 * @param {quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
quat.rotateZ = function (out, a, rad) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate W component of
 * @returns {quat} out
 */
quat.calculateW = function (out, a) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 * @function
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a the first operand
 * @param {quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {quat} out
 */
quat.slerp = function (out, a, b, t) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Calculates the inverse of a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate inverse of
 * @returns {quat} out
 */
quat.invert = function(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quat to calculate conjugate of
 * @returns {quat} out
 */
quat.conjugate = function (out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {quat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {mat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
quat.fromMat3 = function(out, m) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[7]-m[5])*fRoot;
        out[1] = (m[2]-m[6])*fRoot;
        out[2] = (m[3]-m[1])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[k*3+j] - m[j*3+k]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

if(typeof(exports) !== 'undefined') {
    exports.quat = quat;
}
;
  })(shim.exports);
})(this);

//------------------------------------------------------------------
//------------------------------------------------------------------
// END GL-MATRIX 2.2.1


