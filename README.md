FLAG
====

FLAG is an HTML5 game engine built to run 2D games on any HTML5 compatible device. Included in FLAG is the Box2D physics engine. Together with POLE, a browser based editor, and WIND, a dedicated metrics and events system, FLAG is a complete HTML5 game creation solution.

Included in this package is a game.html file which contains the basic set up for any FLAG based game. At the top, there is some css that establishes the structure for the base elements. The elements that make up a well structured FLAG game are as follows. First, there is a parent div called "game" which contain all other elements. Inside the "game" div are three child elements. The first element is a canvas tag called "canvas". This is where FLAG renders all of it's graphics. The second element is a div call "gui". The "gui" div should be used to hold any HTML based interface items for your game. The third child element of the "game" div is a div called "glass". The "glass" div is a non-interactive layer that should be used for loading screens or other non-interactive HTML elements. Both the "gui" and "glass" divs are setup to overlay and maintain the dimensions of the "game" div. Both "gui" and "glass" are optional.

Also included in the package is a js folder which contains three JavaScript files including FLAG.js, the FLAG Game Engine code, GAME.js, a place to write your game logic, and POLE.js, the file that will contain the POLE object created using the POLE editor. All three of these scripts are imported by the game.html file. You can use the local copy of FLAG.js included in this package or you can use https://play.gaming.psu.edu/flag/FLAG/FLAG.js as the url.

The POLE.js file included in this package is blank. It should be replaced by a POLE.js that you create using the POLE editor.
