
var COLLIDE_PLAYER=1;
var COLLIDE_WALL=2;
var COLLIDE_FLOOR=4;
var COLLIDE_ENEMY=8;
var COLLIDE_PICKUP=16;
var COLLIDE_MUSHROOM=32;
var COLLIDE_CUTSCENE=64;

/**
 * GameScene
 * A template game scene
 */
GameScene = pc.Scene.extend('GameScene',
    { },
    {
      gameLayer:null,
      bgLayer:null,
//      rainLayer:null,

      player:null,
      playerControlSystem:null,
      pickupSystem:null,

      input:null,

      rain:null,
      physics:null,
      levelComplete:false,

      playingCutscene:null,

      init:function () {
        this._super();

        this.levelComplete = false;


        //-----------------------------------------------------------------------------
        // game layer
        //-----------------------------------------------------------------------------
        var physics = this.physics = new pc.systems.Physics({
          gravity:{x:0,y:Parameters.gravity}
        });
        var playerControlSystem = this.playerControlSystem = new PlayerControlSystem();

        this.loadFromJson(getTileMap('level'), this);
        var gameLayer = this.gameLayer;
        if(!gameLayer) {
          throw new Error('No player start position.');
          return;
        }
        var wh = this.worldHeight = this.gameLayer.worldSize.y;
        var ww = this.worldWidth = this.gameLayer.worldSize.x;
        //console.log('World size', this.worldWidth, this.worldHeight);
        this.gameLayer.addSystem(new pc.systems.Render());
        this.gameLayer.addSystem(new pc.systems.Effects());
        this.gameLayer.addSystem(physics);
        this.gameLayer.addSystem(new pc.systems.Activation());
        this.gameLayer.addSystem(new pc.systems.Expiration());
        this.gameLayer.addSystem(playerControlSystem);
        this.gameLayer.addSystem(this.pickupSystem = new PickupSystem());
        this.gameLayer.addSystem(this.noiseSystem = new NoiseSystem());


        physics.createStaticBody(   0,   0,   1,wh,  0, COLLIDE_WALL, COLLIDE_PLAYER); // left
        physics.createStaticBody(ww-1,   0,   1,wh,  0, COLLIDE_WALL, COLLIDE_PLAYER); // right
        physics.createStaticBody(   0,   0,  ww, 1,  0, COLLIDE_WALL, COLLIDE_PLAYER); // top
        physics.createStaticBody(   0,wh-1,  ww, 1,  0, COLLIDE_FLOOR, COLLIDE_PLAYER); // bottom

        var input = this.input = playerControlSystem.input = new pc.systems.Input();
        input.onAction = this.onAction.bind(this);
        this.gameLayer.addSystem(input);

        physics.onCollisionStart = this.onCollisionStart.bind(this);
        physics.onCollisionEnd = this.onCollisionEnd.bind(this);
        physics.setDebug(pc.device.game.hasHashState('debug'));

        this.addLayer(new UILayer(20));


      },


      _collisionStart: function(a, b)
      {
        if(a.hasComponentOfType('player'))
        {
          this.playerControlSystem.onTouchPlayer(a, b);
          if(b.hasTag('bouncer'))
          {
            b.getComponent('sprite').sprite.setAnimation('bounce');
            playSound('bounce');
          }
          else if(b.hasComponentOfType('pickup'))
            this.pickupSystem.onTouch(a, b);
          else if(b.hasTag('cutscene'))
          {
            if(this.playingCutscene == null &&
                !(b.hasTag('cutscene2') && this.player.getComponent('player').orbsCollected < 20))
            {
              var sc = b.getComponent('sprite');
              sc.active = true;
              this.playingCutscene = b;
            }
          }
        }
      },

      _collisionEnd:function(a,b)
      {
        if(a.hasComponentOfType('player'))
        {
          this.playerControlSystem.onTouchPlayerEnd(a, b);
        }
      },

      /**
       * Called when an entity first collides with a tile or another entity. Use the fixture types to differentiate
       * collisions with different fixtures.
       * @param {pc.BodyType} aType Type of the collision body (pc.BodyType.TILE or pc.BodyType.ENTITY)
       * @param {pc.BodyType} bType Type of the collision body (pc.BodyType.TILE or pc.BodyType.ENTITY)
       * @param {pc.Entity} entityA If an entity, a reference to the entity that was the first part of the collision
       * @param {pc.Entity} entityB If an entity, a reference to the entity that was the second part of the collision
       * @param {Number} fixtureAType User type provided when fixture was created of the first fixture
       * @param {Number} fixtureBType User type provided when fixture was created of the second fixture
       * @param {b2Contact} contact Additional contact information
       */
      onCollisionStart:function (aType, bType, entityA, entityB, fixtureAType, fixtureBType, contact)
      {
        if (aType == pc.BodyType.ENTITY && bType == pc.BodyType.ENTITY)
        {
          this._collisionStart(entityA, entityB);
          this._collisionStart(entityB, entityA);
        }
      },

      onCollisionEnd: function(aType, bType, entityA, entityB, fixtureAType, fixtureBType, contact)
      {
        if (aType == pc.BodyType.ENTITY && bType == pc.BodyType.ENTITY)
        {
          this._collisionEnd(entityA, entityB);
          this._collisionEnd(entityB, entityA);
        }
      },

      onAction:function(actionName) {
        console.log('scene onAction: '+actionName);
        var ent = uiTarget.getEntity();
        if(ent.hasTag('player')) {
          this.playerControlSystem.onAction(this.player, actionName, event, pos, uiTarget);
        }
      },

      createEntity:function (layer, type, x, y, dir, shape, options)
      {
        console.log('Create entity', type, x, y, dir, shape, options);
        var ent = pc.Entity.create(layer);
        var sprite = null;
        if(type == 'wall' || type == 'floor')
        {
          var rect;
          if('points' in shape)
          {
            rect = shape.getBoundingRect();
          }
          else if('x' in shape && 'y' in shape)
          {
            rect = {
              x:x, y:y,  w:shape.x, h:shape.y
            };
          }
          else
          {
            console.log('Unsupported shape for entity at '+x+','+y)
            return;
          }

          if(rect.w == 0 || rect.h == 0)
          {
            console.log('Zero size entity at '+x+','+y);
            return;
          }

          ent.addComponent(pc.components.Spatial.create(rect));
          var collisionFixture;
          if('points' in shape)
          {
            points = [];
            shape.points.forEach(function(pt) { points.push([pt.x, pt.y])});
            collisionFixture = {shape:pc.CollisionShape.POLY, offset:{x:-rect.w/2, y:rect.h/2}, points: points};
          }
          else
          {
            collisionFixture = {shape:pc.CollisionShape.RECT}
          }
          ent.addComponent(pc.components.Physics.create({
            immovable:true,
            bounce:0,
            collisionGroup:0,
            collisionCategory:(type=='wall'?COLLIDE_WALL:COLLIDE_FLOOR),
            collisionMask:COLLIDE_PLAYER,
            shapes:[collisionFixture]
          }));
          if(type == 'floor')
            ent.addTag('jump_through');
        }
        else if((ss = getAnim(type)))
        {
          var spatial;
          ent.addComponent(sprite = pc.components.Sprite.create({spriteSheet:ss}));
          var frameWidth = ss.getFrameWidth();
          var frameHeight = ss.getFrameHeight();
          ent.addComponent(spatial = pc.components.Spatial.create({
            x:x+(shape.x-ss.frameWidth)/2, y:y+shape.y-ss.frameHeight,  w: frameWidth, h: frameHeight
          }));
          if(type == 'player') {
            if(this.player) {
              ent.remove();
              console.log('Extra player start defined!', x, y);
              return;
            }
            this.player = ent;
            this.gameLayer = layer;
            sprite.sprite.setAnimation('look_right');
            ent.addComponent(PlayerComponent.create({}));
          } else if(type == 'mushroom1' || type == 'mushroom2' || type == 'mushroom3' || type == 'flower1') {
            // Place the mushroom in the bottom center of the box in the map editor
            spatial.pos.x = Math.round(x + (shape.x - frameWidth)/2);
            spatial.pos.y = Math.round(y + (shape.y - frameHeight));
            ent.addComponent(pc.components.Physics.create({
              bounce:type == 'mushroom3' ? 1.2 : type == 'mushroom2' ? 1.7 : 2.5,
              immovable:true,
              shapes:getAnimShapes(type),
              collisionGroup:COLLIDE_MUSHROOM,
              collisionCategory:COLLIDE_MUSHROOM,
              collisionMask:COLLIDE_PLAYER
            }));
            sprite.sprite.setAnimation('idle');
            ent.addTag('bouncer');
            ent.addTag('jump_through');
          } else if(type == 'cutscene1' || type == 'cutscene2') {
            spatial.pos.x = x;
            spatial.pos.y = y;
            spatial.dim.x = shape.x;
            spatial.dim.y = shape.y;
            ent.addComponent(pc.components.Physics.create({
              immovable:true,
              sensorOnly:true,
              collisionGroup:COLLIDE_CUTSCENE,
              collisionCategory:COLLIDE_CUTSCENE,
              collisionMask:COLLIDE_PLAYER
            }));
            sprite.active = false;
            sprite.sprite.setAnimation('cutscene');
            ent.addTag('cutscene');

          } else if(type == 'orb') {
            ent.addComponent(pc.components.Physics.create({
              gravity:{x:0,y:0},
              sensorOnly:true,
              shapes:getAnimShapes(type),
              collisionGroup:COLLIDE_PICKUP,
              collisionCategory:COLLIDE_PICKUP,
              collisionMask:COLLIDE_PLAYER
            }));
            sprite.sprite.setAnimation('float');
            ent.addComponent(pc.components.Activator.create({
              tag:'player', range:900
            }));
            ent.addComponent(PickupComponent.create({}));
          }
        }

        ent.addTag(type);
      },

      process:function ()
      {
        if(this.playingCutscene && this.playingCutscene.getComponent('sprite').sprite.loopCount > 0)
        {
          this.playingCutscene = null;
        }
        if(!this.levelComplete && this.player && this.player.active) {
          var cameraTarget = this.playingCutscene || this.player;
          var targetPos = cameraTarget.getComponent('spatial').getCenterPos();

          // Follow the player
          var targetOriginX = Math.max(0, Math.min(this.worldWidth - this.viewPort.w, targetPos.x - this.viewPort.w/3));
          var targetOriginY = Math.max(0, Math.min(this.worldHeight - this.viewPort.h, targetPos.y - this.viewPort.h/2));
          var currentOriginX = this.gameLayer.origin.x;
          var currentOriginY = this.gameLayer.origin.y;
          var originDeltaX = (targetOriginX-currentOriginX)*0.5;
          var originDeltaY = (targetOriginY-currentOriginY)*0.5;
          var originX = currentOriginX + originDeltaX;
          var originY = currentOriginY + originDeltaY;
          this.gameLayer.setOrigin(originX,  originY);
//          if(targetPos.x >= this.worldWidth) {
//            // Level complete
//            playSound('applause');
//            this.levelComplete = true;
//          }
        }

        // Make floors above the bottom of the player non-collidable
        // This isn't working for mushrooms because their bounding box is
        // so much bigger than their collision poly
        var playerSpatial = this.player.getComponent('spatial');
        var playerTop = playerSpatial.pos.y;
        var playerBottom = playerTop + playerSpatial.dim.y - 1;
        var floors = this.gameLayer.entityManager.getTagged('floor');
        for(var next = floors.first; next != null; next = next.next())
        {
          var floor = next.obj;
          var floorPhysics = floor.getComponent('physics');
          var floorTop = floor.getComponent('spatial').pos.y;
          var mask = floorPhysics.collisionMask;
          if(floorTop < playerTop)
            mask = 0;
          else if(floorTop > playerBottom)
            mask = COLLIDE_PLAYER;
          if(mask != floorPhysics.collisionMask)
            floorPhysics.setCollisionMask(mask);
        }

        // Make the "rain layer" fall down
//        var rainLayer = this.rainLayer;
//        var rainOriginY = this.gameLayer.origin.y + (this.worldHeight - ((Date.now()/2) % this.worldHeight));
//        rainLayer.setOrigin(originX, rainOriginY);

        if(pc.device.canvasHeight > this.worldHeight) {
          pc.device.ctx.clearRect(0, this.worldHeight, pc.device.canvasWidth, pc.device.canvasHeight-this.worldHeight);
        }

        // always call the super
        this._super();


      }
    });
