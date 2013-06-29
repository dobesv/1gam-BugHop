PlayerComponent = pc.components.Component.extend('PlayerComponent',
    {
      create:function (options)
      {
        var c = this._super();
        c.config(options);
        return  c;
      }
    },
    {
      energy:100,
      orbsCollected:0,
      resting:false,
      dead:false,
      onGround:0,

      init: function(options) {
        this._super('player');
        if(pc.valid(options))
          this.config(options);
      },

      config:function(options) {
        this.energy = pc.checked(options.energy, 100);
        this.dead = false;
      },

      die:function(inWater) {

      },

      onPickupEnergy:function(amount) {
        this.energy += amount;
        this.orbsCollected += 1;
        this.resting = false;
      }
    });

