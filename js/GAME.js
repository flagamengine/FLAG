/*
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
FLAG Game Engine - GAME.js
Author: Zac Zidik
URL: www.flagamengine.com
version 3.0

Once you have created your POLE object using the editor, this file is a good
starting point. It uses a good structure to introduce logic for your game.
There is lots of commenting and example code here that you can delete 
once you are comfortable.

Thanks for trying out the FLAG Game Engine and good luck!
----------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------
*/


//START
//----------------------------------------------------------------------------------------------
//called immediately after the FLAG Engine is initialized

function start(){
	
	//call the FLAG.loadScene function to tell FLAG the name or number of the scene from the POLE Object to begin rendering
	//use a callback function to set up your game logic after the scene is loaded
	
	FLAG.loadScene(0,scene_0_Loaded);
}

//----------------------------------------------------------------------------------------------
//END START


//SCENES
//----------------------------------------------------------------------------------------------
//called after scene is loaded
/*
You can use a callBack function as a place to set up game logic for the loaded scene.
Every Scene in your game might have different logic. By using the FLAG.Scene object,
and by initializing the methods on a unique Scene loaded callback, you can be sure that
these methods will only be present when you need them to be
*/
//------------------------------------------------------------------
//------------------------------------------------------------------

function scene_0_Loaded(){
	
	//CUSTOM PROPERTIES and FUNCTIONS
	//-----------------------------------------------
	
	//Declare unique Scene specific properties and functions here
	//FLAG.Scene.myFunction = function(){};
	//FLAG.Scene.myProperty = "myPropertyValue";
	
	//-----------------------------------------------
	//END CUSTOM PROPERTIES and FUNCTIONS
	

	//GAME LOOP
	//-----------------------------------------------
		
	FLAG.Scene.update = function(){
	
		//insert your game loop logic
		
		
		//COLLISION DETECTION
		//------------------------
		//detect when two actor's bodies come into contact
		
		//Pre-contact listener
		FLAG.ContactListener.PreSolve = function(contact){
			
			//these examples can be used in PreSolve, BeginContact or EndContact
			
			/*
			//example - 1
			//store the contacts userData
			var contactA = contact.GetFixtureA().GetBody().GetUserData();
			var contactB = contact.GetFixtureB().GetBody().GetUserData();
			
			//use the names of the two bodies in contact to identify the collision
			if((contactA.name == "bodyName_1" && contactB.name == "bodyName_2") || (contactB.name == "bodyName_1" && contactA.name == "bodyName_2")){
			
				//do something as a result of the collision
			
			}
			*/
			
			/*
			//example - 2
			//store the contacts userData
			var contactA = contact.GetFixtureA().GetBody().GetUserData();
			var contactB = contact.GetFixtureB().GetBody().GetUserData();
			
			//use the names of the parent actors of the bodies in contact to identify the collision
			if((contactA.parentActorName == "ActorName_1" && contactB.parentActorName == "ActorName_2") || (contactB.parentActorName == "ActorName_1" && contactA.parentActorName == "ActorName_2")){
			
				//do something as a result of the collision
			
			}
			*/
		}
		
		//Begin contact listener
		FLAG.ContactListener.BeginContact = function(contact){
		
			
		}
		
		//End contact listener
		FLAG.ContactListener.EndContact = function(contact){
		
			
		}
		
		//Post contact listener
		FLAG.ContactListener.PostSolve = function(contact){
		
			
		}
		//------------------------
		//END COLLISION DETECTION		
		
	}
		
	//-----------------------------------------------
	//END GAME LOOP
	
	
	//KEY INPUTS
	//-----------------------------------------------
	
	//key down listener
	//-----------------------
	
	FLAG.Scene.keyDown = function(e){
	
		//insert your key down events
		
		/*example
		if(e.keyCode = 32){
			console.log("The spacebar is down.");
		}
		*/
	
	}
	
	//-----------------------
	//end key down listener
	
	//key up listener
	//-----------------------
	
	FLAG.Scene.keyUp = function(e){
	
		//insert your key up events
		
		/*example
		if(e.keyCode = 32){
			console.log("The spacebar is up.");
		}
		*/
	
	}
	
	//-----------------------
	//end key up listener
	
	//-----------------------------------------------
	//END KEY INPUTS
	
	
	//MOUSE INPUTS
	//-----------------------------------------------
	
	//mouse down listener
	//-----------------------
	
	FLAG.Scene.mouseDown = function(e){
	
		//insert your mouse down events
	}
	
	//-----------------------
	//end mouse down listener
	
	//mouse up listener
	//-----------------------
	
	FLAG.Scene.mouseUp = function(e){
	
		//insert your mouse up events
	}
	
	//-----------------------
	//end mouse up listener
	
	//mouse move listener
	//-----------------------
	
	FLAG.Scene.mouseMove = function(e){
	
		//insert your mouse move events
	}
	
	//-----------------------
	//end mouse move listener
	
	//mouse out listener
	//-----------------------
	
	FLAG.Scene.mouseOut = function(e){
	
		//insert your mouse out events
	}
	
	//-----------------------
	//end mouse out listener
	
	//-----------------------------------------------
	//END MOUSE INPUTS
	
	
	//TOUCH INPUTS
	//-----------------------------------------------
	
	//touch down listener
	//-----------------------
	
	FLAG.Scene.touchDown = function(e){
	
		//insert your touch down events
	}
	
	//-----------------------
	//end touch down listener
	
	//touch up listener
	//-----------------------
	
	FLAG.Scene.touchUp = function(e){
	
		//insert your touch up events
	}
	
	//-----------------------
	//end touch up listener
	
	//touch move listener
	//-----------------------
	
	FLAG.Scene.touchMove = function(e){
	
		//insert your touch move events
	}
	
	//-----------------------
	//end touch move listener
	
	//touch out listener
	//-----------------------
	
	FLAG.Scene.touchOut = function(e){
	
		//insert your touch out events
	}
	
	//-----------------------
	//end touch out listener
	
	//-----------------------------------------------
	//END TOUCH INPUTS
}

//----------------------------------------------------------------------------------------------
//END SCENES
