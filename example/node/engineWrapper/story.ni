"Stop the IFPress!" by David Cornelson

Include FyreVM Core by David Cornelson.
Include FyreVM Banner Output by David Cornelson.
Include FyreVM Prologue by David Cornelson.

The story headline is "An IF Press Demonstration".
The story genre is "Zorkian".
The story creation year is 2016.

A trigger is a kind of value. The triggers are fire and stop.

A room has a trigger called the event. The event of The Offices is stop.

When play begins while outputting channels (this is the prologue channel rule):
	 select the prologue channel;
	 say "During the Great Underground Industrial Revolution, immediately following the disappearance of magic, the IF Press Gazette was created to make up for the lost tradition of the New Zork Times. Even without magic, some things seemed to get done in magical ways...";
	 select the main channel.

The Press Room is a room. "Amidst the cavernous warehouse are large printing presses, large rolls of paper, and barrels of ink. Men and women scurry about, putting tomorrow's edition of the IF Press Gazette together. The loading dock is to the north while the offices are to the south."

The Dock is north of The Press Room. "Trucks flow in and out of the docking area, picking up stacks of bound copies of the IF Press Gazette."

The Offices are south of The Press Room. "Reporters and other personnel sit ensconced in small metal desks, tapping away on typewriters recently converted to manual interaction (they once acted via magical spells)."

Every turn:
	if the location of the player is The Dock and the event of The Offices is stop:
		now the event of The Offices is fire;
		say "What do you wish to name your World?";
		now the command prompt is ">>".
	
After reading a command when event of The Offices is fire:
	now the event of The Offices is stop;
	Let R be the player's command in title case;
	say "[r]";
	now the command prompt is ">";
	reject the player's command.
