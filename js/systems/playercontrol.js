
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

        pc.device.input.bindAction(this, 'godmode', 'G');
        pc.device.input.bindAction(this, 'kill', 'K');
        pc.device.input.bindAction(this, 'wind+', 'NUM_6');
        pc.device.input.bindAction(this, 'wind-', 'NUM_4');
        pc.device.input.bindAction(this, 'gravity+', 'NUM_2');
        pc.device.input.bindAction(this, 'gravity-', 'NUM_8');
        pc.device.input.bindAction(this, 'drainRate+', 'NUM_9');
        pc.device.input.bindAction(this, 'drainRate-', 'NUM_7');
        pc.device.input.bindAction(this, 'recoveryRate+', 'NUM_3');
        pc.device.input.bindAction(this, 'recoveryRate-', 'NUM_1');
        pc.device.input.bindAction(this, 'J1', '1');
        pc.device.input.bindAction(this, 'J2', '2');
        pc.device.input.bindAction(this, 'J3', '3');
        pc.device.input.bindAction(this, 'J4', '4');
        pc.device.input.bindAction(this, 'J5', '5');
        pc.device.input.bindAction(this, 'J6', '6');
        pc.device.input.bindAction(this, 'J7', '7');
        pc.device.input.bindAction(this, 'J8', '8');
        pc.device.input.bindAction(this, 'J9', '9');
        pc.device.input.bindAction(this, 'J0', '0');
      },

      onAction: function(actionName) {
        this.info("Action: "+actionName);
        switch(actionName) {
          case 'godmode': pc.device.game.toggleHashState('god', this.godmode = !this.godmode); break;
          case 'kill':  getPlayer().getComponent('player').die(); break;
          case 'wind+': pc.device.game.setHashState('windSpeed', this.windSpeed += 0.1); break;
          case 'wind-': pc.device.game.setHashState('windSpeed', this.windSpeed -= 0.1); break;
          case 'gravity+': pc.device.game.setHashState('fallSpeed', this.fallSpeed += 0.05); break;
          case 'gravity-': pc.device.game.setHashState('fallSpeed', this.fallSpeed -= 0.05); break;
          case 'drainRate+': pc.device.game.setHashState('drainRateAdjust', this.drainRateAdjust += 0.005); break;
          case 'drainRate-': pc.device.game.setHashState('drainRateAdjust', this.drainRateAdjust -= 0.005); break;
          case 'recoveryRate+': pc.device.game.setHashState('recoveryRateAdjust', this.recoveryRateAdjust += 0.005); break;
          case 'recoveryRate-': pc.device.game.setHashState('recoveryRateAdjust', this.recoveryRateAdjust -= 0.005); break;
          case 'J1': this.jumpTo(0.1); break;
          case 'J2': this.jumpTo(0.2); break;
          case 'J3': this.jumpTo(0.3); break;
          case 'J4': this.jumpTo(0.4); break;
          case 'J5': this.jumpTo(0.5); break;
          case 'J6': this.jumpTo(0.6); break;
          case 'J7': this.jumpTo(0.7); break;
          case 'J8': this.jumpTo(0.8); break;
          case 'J9': this.jumpTo(0.9); break;
          case 'J0': this.jumpTo(1.0); break;
        }
      },

      getPlayer: function() {
        return this.entities.first ? this.entities.first.obj : null;
      },

      jumpTo: function(levelFraction) {
        var player = this.getPlayer();
        player.getComponent('spatial').pos.x = (player.layer.worldSize.x - 1024) * levelFraction;
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
          if(!pc.device.game.gameScene.playingCutscene)
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