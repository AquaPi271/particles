# Description:

I am interested in one or two ideas for particle systems.  I tend to be a little optimistic so was hoping to get feedback about what seems reasonable based on prior projects.  The first idea is to create an N-body system where particles are attracted or repulsed depending on interactions.  For example, a gravity or magnetic system could be modeled.  

## Component 1:

Render particles that interact via some attraction rule such as gravity or magnetism.  Allow for a premade "solar" system setup.

## Component 2:

Render on a 3D projection with camera controls or in a texture.  Give particles a lifetime.

## Component 3:

Objects that attract can merge making a larger object.  Takes on characteristics of combined objects somehow (momentum).  Collision detection.

## Component 4:

Allow the particle emitter to be configured.  For example, a "super-nova" effect could emit particles in a spherical shell.  A "quasar" might emit in a cone.  Experiment with other patterns here.

## Component 5:

Add another effect possibly one of these:  1)  Have particles maintain a "history" by allowing tracing of particle paths for X number of frames (perhaps on the larger objects).  2)  Place "wormholes" that transport particles instantaneously to another part of the world.  3)  Add obstacles that deflect particle paths.

## Extra Credit:

Attempt computations mostly or nearly wholly on GPU via TransformFeedbacks.  Experiment with how many more particles can be added.

---------------------------------------------------------------------------------------

## Immediate Goals / TODOS:

[DONE] 1. Setup to render some dots on the screen directly.  Place in plane with z=0 to make them 2D.
[DONE] 2. Do a 2D simulation of gravity with these dots using Newton's laws:
  [DONE] a) Modify Newton's law by scaling for reasonable units.
[DONE] 3.  2D collision and merge using simple radius / distance.  Use simple ratioed mass / velocity.
4.  Line trails.
5.  Render simple sprite in 3D space.
6.  Add camera controls.
7.  Modify sprite to be view plane aligned.
8.  Add several sprites.
9.  Try to do simple system (Sun + Earth) in 3D.
10. Need to figure Z component of velocity.


1 ->  outstanding [2] : merged []
2 ->  outstanding [1,3] : merged []
3 ->  outstanding [2,4,5] : merged []
4 ->  outstanding [3] : merged []
5 ->  outstanding [3] : merged []

--------------------------------------------

1 ->  outstanding [3] : merged [2]          
2 ->  outstanding [] : merged []
3 ->  outstanding [1,4,5] : merged []
4 ->  outstanding [3] : merged []
5 ->  outstanding [3] : merged []

--------------------------------------------

1 ->  outstanding [4,5] : merged [2,3]          
2 ->  outstanding [] : merged []
3 ->  outstanding [] : merged []
4 ->  outstanding [1] : merged []
5 ->  outstanding [1] : merged []

--------------------------------------------

1 ->  outstanding [5] : merged [2,3,4]          
2 ->  outstanding [] : merged []
3 ->  outstanding [] : merged []
4 ->  outstanding [] : merged []
5 ->  outstanding [1] : merged []

--------------------------------------------

1 ->  outstanding [] : merged [2,3,4,5]          
2 ->  outstanding [] : merged []
3 ->  outstanding [] : merged []
4 ->  outstanding [] : merged []
5 ->  outstanding [] : merged []

========================================================

1 ->  outstanding [2] : merged {1}
2 ->  outstanding [1,3] : merged {2}
3 ->  outstanding [2] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [3] : merged {1,2}          # Set current_merge = 1, current_outstanding = 2.
2 ->  outstanding [] : merged {2}             # Place current_outstanding's merged into current_merge merged.
3 ->  outstanding [2] : merged {3}            # Clear current_outstanding array.  Enter new elements into 
4 ->  outstanding [5] : merged {4}            # outstanding (that isn't current_merge or current_outstanding)
5 ->  outstanding [4] : merged {5}            # Remove current_outstanding from outstanding array.

--------------------------------------------

1 ->  outstanding [3] : merged {1,2}          # In the remaining elements, replace current_outstanding with
2 ->  outstanding [] : merged {2}             # current_merge.
3 ->  outstanding [1] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 1, current_outstanding = 3, repeat
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 1, current_outstanding = null, move to next
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 2, current_outstanding = null, move to next
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 3, current_outstanding = null, move to next
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [5] : merged {4}
5 ->  outstanding [4] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 4, current_outstanding = 5, merge
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [] : merged {4,5}
5 ->  outstanding [] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 4, current_outstanding = null, move to next
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [] : merged {4,5}
5 ->  outstanding [] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          current_merge = 5, current_outstanding = null, move to next
2 ->  outstanding [] : merged {2}             
3 ->  outstanding [] : merged {3}
4 ->  outstanding [] : merged {4,5}
5 ->  outstanding [] : merged {5}

--------------------------------------------

1 ->  outstanding [] : merged {1,2,3}          Merging done, visit each element, if merged.length > 1 then merge
2 ->  outstanding [] : merged {2}              those together.
3 ->  outstanding [] : merged {3}
4 ->  outstanding [] : merged {4,5}
5 ->  outstanding [] : merged {5}

