## chester - FyreVM command line utility

This is a command line tool that allows the author to test a FyreVM based Glulx story one turn at a time.

### To start a story...

    $ chester ifpress.ulx session
    {"MAIN":"\nStop the IFPress!\nAn IF Press Demonstration by David Cornelson\nRelease 1 / Serial number 160421 / Inform 7 build 6L38 (I6/v6.33 lib 6/12N) SD\n\nAmidst the cavernous warehouse are large printing presses, large rolls of paper, and barrels of ink. Men and women scurry about, putting tomorrow's edition of the IF Press Gazette together. The loading dock is to the north while the offices are to the south.\n\n","PLOG":"During the Great Underground Industrial Revolution, immediately following the disappearance of magic, the IF Press Gazette was created to make up for the lost tradition of the New Zork Times. Even without magic, some things seemed to get done in magical ways...\n","PRPT":">","LOCN":"Press Room","SCOR":"0","TIME":"540","TURN":"1"}
    
### To continue story with a command...

    $ chester ifpress.ulx session "north"
    {"MAIN":"\nTrucks flow in and out of the docking area, picking up stacks of bound copies of the IF Press Gazette.\n\n\n","PRPT":">","LOCN":"Dock","SCOR":"0","TIME":"541","TURN":"2","INFO":"{ storyTitle: \"Stop the IFPress!\", storyHeadline: \"An IF Press Demonstration\", storyAuthor: \"David Cornelson\", storyCreationYear: \"2016\", releaseNumber: \"1\", serialNumber: \"160421\", inform7Build: \"6L38\", inform6Library: \"6.33\", inform7Library: \"6/12N\", strictMode: \"S\", debugMode: \"D\" }"}

### And two more...

    $ chester ifpress.ulx session "south"
    {"MAIN":"\nAmidst the cavernous warehouse are large printing presses, large rolls of paper, and barrels of ink. Men and women scurry about, putting tomorrow's edition of the IF Press Gazette together. The loading dock is to the north while the offices are to the south.\n\n\n","PRPT":">","LOCN":"Press Room","SCOR":"0","TIME":"542","TURN":"3","INFO":"{ storyTitle: \"Stop the IFPress!\", storyHeadline: \"An IF Press Demonstration\", storyAuthor: \"David Cornelson\", storyCreationYear: \"2016\", releaseNumber: \"1\", serialNumber: \"160421\", inform7Build: \"6L38\", inform6Library: \"6.33\", inform7Library: \"6/12N\", strictMode: \"S\", debugMode: \"D\" }"}

    $ chester ifpress.ulx session "south"
    {"MAIN":"\nReporters and other personnel sit ensconced in small metal desks, tapping away on typewriters recently converted to manual interaction (they once acted via magical spells).\n\n\n","PRPT":">","LOCN":"Offices","SCOR":"0","TIME":"543","TURN":"4","INFO":"{ storyTitle: \"Stop the IFPress!\", storyHeadline: \"An IF Press Demonstration\", storyAuthor: \"David Cornelson\", storyCreationYear: \"2016\", releaseNumber: \"1\", serialNumber: \"160421\", inform7Build: \"6L38\", inform6Library: \"6.33\", inform7Library: \"6/12N\", strictMode: \"S\", debugMode: \"D\" }"}
    
### And we can backtrack to a previous turn to "branch" our play...

    $ chester ifpress.ulx session "south" 1
    {"MAIN":"\nReporters and other personnel sit ensconced in small metal desks, tapping away on typewriters recently converted to manual interaction (they once acted via magical spells).\n\n\n","PRPT":">","LOCN":"Offices","SCOR":"0","TIME":"541","TURN":"2","INFO":"{ storyTitle: \"Stop the IFPress!\", storyHeadline: \"An IF Press Demonstration\", storyAuthor: \"David Cornelson\", storyCreationYear: \"2016\", releaseNumber: \"1\", serialNumber: \"160421\", inform7Build: \"6L38\", inform6Library: \"6.33\", inform7Library: \"6/12N\", strictMode: \"S\", debugMode: \"D\" }"}
    
### After all of these commands, our directory will contain the following session files (Quetzal save files):

    04/22/2016  09:28 AM           107,336 session.1
    04/22/2016  09:31 AM           107,336 session.1.1
    04/22/2016  09:29 AM           107,336 session.2
    04/22/2016  09:30 AM           107,336 session.3
    04/22/2016  09:30 AM           107,336 session.4

### To continue the branched story execution, we change the session file...

    $ chester ifpress.ulx session.1 "north"
    {"MAIN":"\nAmidst the cavernous warehouse are large printing presses, large rolls of paper, and barrels of ink. Men and women scurry about, putting tomorrow's edition of the IF Press Gazette together. The loading dock is to the north while the offices are to the south.\n\n\n","PRPT":">","LOCN":"Press Room","SCOR":"0","TIME":"542","TURN":"3","INFO":"{ storyTitle: \"Stop the IFPress!\", storyHeadline: \"An IF Press Demonstration\", storyAuthor: \"David Cornelson\", storyCreationYear: \"2016\", releaseNumber: \"1\", serialNumber: \"160421\", inform7Build: \"6L38\", inform6Library: \"6.33\", inform7Library: \"6/12N\", strictMode: \"S\", debugMode: \"D\" }"}
    
### And now we have one more session file:

    04/22/2016  09:28 AM           107,336 session.1
    04/22/2016  09:31 AM           107,336 session.1.1
    04/22/2016  09:34 AM           107,336 session.1.2
    04/22/2016  09:29 AM           107,336 session.2
    04/22/2016  09:30 AM           107,336 session.3
    04/22/2016  09:30 AM           107,336 session.4

