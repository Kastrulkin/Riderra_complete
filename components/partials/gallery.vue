<template>
  <div class="gallery" id="gallery" ref="gallery">

  </div>
</template>


<script>
  export default {
    computed:{
      media() {
        return this.$store.state.media;
      },
    },
    data() {
      return {
        imgs: [
          '/img/gallery/1.jpg',
          '/img/gallery/2.jpg',
          '/img/gallery/3.jpg',
          '/img/gallery/4.jpg',
          '/img/gallery/5.jpg',
          '/img/gallery/6.jpg',
          '/img/gallery/7.jpg',
          '/img/gallery/8.jpg',
          '/img/gallery/9.jpg',
          '/img/gallery/10.jpg',
          '/img/gallery/11.jpg',
          '/img/gallery/12.jpg',
          '/img/gallery/13.jpg',
          '/img/gallery/14.jpg',
          '/img/gallery/15.jpg',
          '/img/gallery/16.jpg',
          '/img/gallery/17.jpg',
          '/img/gallery/18.jpg',
          '/img/gallery/19.jpg',
          '/img/gallery/20.jpg',
          '/img/gallery/21.jpg',
          '/img/gallery/22.jpg',
          '/img/gallery/23.jpg',
          '/img/gallery/24.jpg',
          '/img/gallery/25.jpg',
          '/img/gallery/26.jpg',
          '/img/gallery/27.jpg',
          '/img/gallery/28.jpg',
          '/img/gallery/29.jpg',
          '/img/gallery/30.jpg',
          '/img/gallery/31.jpg',
          '/img/gallery/32.jpg',
          '/img/gallery/33.jpg',
          '/img/gallery/34.jpg',
          '/img/gallery/35.jpg',
          '/img/gallery/36.jpg',
          '/img/gallery/37.jpg',
          '/img/gallery/38.jpg',
          '/img/gallery/39.jpg',
          '/img/gallery/40.jpg',
          '/img/gallery/41.jpg',
          '/img/gallery/42.jpg',
          '/img/gallery/43.jpg',
          '/img/gallery/44.jpg',
          '/img/gallery/45.jpg',
          '/img/gallery/46.jpg',
          '/img/gallery/47.jpg',
          '/img/gallery/48.jpg',
          '/img/gallery/49.jpg',
          '/img/gallery/50.jpg',
        ],
      }
    },
    methods: {
      createElements() {
        var count = 30,
          rows = 3,
          that = this,
          wrap = this.$refs.gallery,
          resArray = [],
          width = 0,
          left = 0,
          top = 0,
          div = null,
          divFace = null,
          divBackface = null;

        count = this.media === 'mobile' ? 6 : (this.media === 'tablet' ? 12 : count);
        rows = this.media === 'mobile' ? 2 : 3;

        div = document.querySelectorAll('.gallery-item');

        if(div.length){
          for (let i = 0; i < count; i++) {
            div.removeChild(div.childNodes[i]);
          }
        }



        for (let i = 0; i < count; i++) {
          var wide = 1,
            leftCoef = 0;

          div = document.createElement('div');
          divFace = document.createElement('div');
          divBackface = document.createElement('div');

          width = window.innerWidth / (count / rows);

          div.classList.add('gallery-item')
          // div.style.cssText = `width: ${width}px; height: ${width}px; left: ${(width * wide)}px; top: ${top}px`;
          div.style.cssText = `width: ${width}px; height: ${width}px;`;

          divFace.style.backgroundImage = `url(${that.imgs[i]})`;
          divFace.classList.add('gallery-item__face');

          divBackface.classList.add('gallery-item__back-face');
          divBackface.style.backgroundImage = `url(${that.imgs[17 + i]})`;

          resArray.push(div);

          div.appendChild(divFace);
          div.appendChild(divBackface);
          wrap.appendChild(div);

        }
        var flipItem = 0,
          flipArr = [];
        setInterval(function () {
          flipItem = that.randomize(0, count - 1);
          flipArr.forEach(function (item) {
            if (flipItem !== item) {
              resArray[flipItem].classList.add('flip')
              // console.log(flipItem)
            } else {
              return;
            }
          });
          flipArr.push(flipItem);

        }, 2000);


      },
      randomize(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;
      }
    },
    beforeMount(){
      this.$nextTick(()=>{
        let that = this,
          resizeTimeout = null;

        document.addEventListener('resize', function(){

            that.createElements
        });
      })

    },
    mounted() {
      this.createElements();

      function getSubStr(str, delim) {
        var a = str.indexOf(delim);

        if (a == -1)
          return '';

        var b = str.indexOf(delim, a+1);

        if (b == -1)
          return '';

        return str.substr(a+1, b-a-1);
        //                 ^    ^- length = gap between delimiters
        //                 |- start = just after the first delimiter
      }





    }
  }
</script>

<style lang="scss">

  .gallery {
    width: 100%;
    background: #fff !important;
    display: table;

  }

  .gallery-item {
    position: relative;
    transition: transform 0.8s;
    transform-style: preserve-3d;
    float: left;

    &:after{
      display: table;
      clear: both;
    }

    &__face,
    &__back-face {
      position: absolute;
      width: 100%;
      height: 100%;
      background-repeat: no-repeat;
      background-size: 110%;
      background-position: center;
      backface-visibility: hidden;

    }

    &__back-face {
      transform: rotateX(180deg);
    }

    &.flip{
      transform: rotateX(180deg);

    }

  }

</style>
