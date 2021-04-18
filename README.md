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

1. Setup to render some dots on the screen directly.  Place in plane with z=0 to make them 2D.
2. Do a 2D simulation of gravity with these dots using Newton's laws:
  a) Modify Newton's law by scaling for reasonable units.