
PlayerControlSystem = pc.systems.EntitySystem.extend('PlayerControlSystem',
    {},
    {
      input:null,
      godmode:false,
      windSpeed:Parameters.windSpeed,
      fallSpeed:Parameters.fallSpeed,
      waterLevel: Parameters.waterLevel,
      recoveryRateAdjust: 0,
      drainRateAdjust:0,

      init: function()
      {
        this._super(['player']);
        this.godmode = pc.device.game.hasHashState('god');
        this.windSpeed = parseFloat(pc.device.game.getHashState('windSpeed', '0')) || this.windSpeed;
        this.fallSpeed = parseFloat(pc.device.game.getHashState('fallSpeed', '0')) || this.fallSpeed;
        this.recoveryRateAdjust = parseFloat(pc.device.game.getHashState('recoveryRateAdjust', '0')) || this.recoveryRateAdjust;
        this.drainRateAdjust = parseFloat(pc.device.game.getHashState('drainRateAdjust', '0')) || this.drainRateAdjust;
      },

      onEntityAdded:function(player) {
        var input = pc.components.Input.create({
          states: [
            ['left', ['A', 'LEFT']],
            ['right', ['D', 'RIGHT']],
            ['up', ['W', 'UP', 'SPACE']],
            ['down', ['S', 'DOWN']],
            ['lmb', ['TOUCH', 'MOUSE_BUTTON_LEFT_DOWN', 'MOUSE_BUTTON_RIGHT_DOWN'], false],
            ['rmb', ['MOUSE_BUTTON_RIGHT_DOWN'], false]
          ]
        });

        var spatial = player.getComponent('spatial');
        player.addComponent(input);
        player.addComponent(pc.components.Physics.create({
          gravity:{x:0,y:Parameters.gravity},
          linearDamping:Parameters.playerLinearDamping,
          mass:Parameters.playerMass,
          faceVel:false,
          fixedRotation:true,
          bounce:Parameters.playerBounce,
          shapes:getAnimShapes('player'),
          collisionGroup:COLLIDE_PLAYER,
          collisionCategory:COLLIDE_PLAYER,
          collisionMask:COLLIDE_FLOOR|COLLIDE_WALL|COLLIDE_ENEMY|COLLIDE_PICKUP|COLLIDE_MUSHROOM
        }));
        player.addComponent(NoiseMaker.create({}));
      },

      onAction: function(actionName) {
      },

      getPlayer: function() {
        return this.entities.first ? this.entities.first.obj : null;
      },

      onTouchPlayer: function(player, what) {
        if(what.hasTag('predator')) {
          // Touched a predator
          if(!this.godmode) {
            player.getComponent('player').die();
          }
        }
        if(what.hasTag('floor')) {
          player.getComponent('player').onGround++;
          if(!pc.device.game.gameScene.playingCutscene && player.getComponent('physics').getSpeed() > 10)
            playSound('land');
        }
      },

      onTouchPlayerEnd:function(player, what) {
        if(what.hasTag('floor')) {
          player.getComponent('player').onGround--;
        }
      },

      process: function(player) {
        var c = player.getComponent('player');
        if (!c.active) return;

        var playerSpatial = player.getComponent('spatial');
        var playerPhysics = player.getComponent('physics');
        var playerPos = playerSpatial.getPos();

        if(pc.device.game.gameScene.levelComplete) {
          c.active = false;
          playerPhysics.setCollisionMask(0);
          if(playerSpatial.pos.x < player.layer.worldSize.x) {
            playerPhysics.applyForce(1,0);
          }
          return;
        }

        var isOn = function isOn(s) {
          return this.input.isInputState(player, s);
        }.bind(this);


        var sprite = player.getComponent('sprite').sprite;
        if(pc.device.game.gameScene.playingCutscene)
        {
          sprite.setAnimation('look', 0, false);
          if(isOn('up')) pc.device.game.gameScene.playingCutscene = null;
        }
        else
        {
          var moveX = 0;
          var moveY = 0;
          var topSpeed = Parameters.playerTopSpeed;
          var topForce = Parameters.playerTopForce;
          var linearVelocity = playerPhysics.getLinearVelocity();
          if(isOn('up') && c.onGround && linearVelocity.y > -Parameters.jump)
          {
            playerPhysics.applyImpulse(Parameters.jump, -90);
            playSound('jump');
          }
          if(isOn('left')) { moveX = -topSpeed;  };
          if(isOn('right')) { moveX = topSpeed;  };

          if(c.onGround || moveX != 0)
            playerPhysics.applyForce(Math.max(-topForce, Math.min(topForce, moveX-linearVelocity.x)), 0);

          sprite.setAnimation(c.onGround && moveX != 0 ? 'bounce' : 'look', 0, false);
          if(moveX < 0) sprite.scaleX = -Math.abs(sprite.scaleX);
          else if(moveX > 0) sprite.scaleX = Math.abs(sprite.scaleX);

          playerPhysics.setCollisionMask(
              (linearVelocity.x != 0 || moveX != 0 ? COLLIDE_WALL : 0) |
              (linearVelocity.y >= -1 ? COLLIDE_FLOOR|COLLIDE_MUSHROOM : 0) |
              COLLIDE_ENEMY|COLLIDE_PICKUP|COLLIDE_CUTSCENE
          );
        }

        var text = player.getComponent('text');
        if(this.godmode) {
          if(pc.valid(text)) {
            text.text = "GOD";
            text.active = true;
          } else {
            text = pc.components.Text.create({
              color:'#000000',
              offset:{x:-20,y:-50},
              fontHeight:10,
              font:'sans-serif'
            });
            player.addComponent(text);
          }
        } else {
          if(pc.valid(text)) text.active = false;
        }
      }
    });