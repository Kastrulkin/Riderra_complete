<template>
  <div class="gallery" id="gallery" ref="gallery">

  </div>
</template>


<script>
  export default {
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
        ],
      }
    },
    methods: {
      createElements() {
        var count = 30,
          that = this,
          wrap = this.$refs.gallery,
          resArray = [],
          width = 0,
          left = 0,
          top = 0,
          div = null,
          divFace = null,
          divBackface = null;

        for (let i = 0; i < count; i++) {
          var wide = 1,
              leftCoef = 0;

          div = document.createElement('div');
          divFace = document.createElement('div');
          divBackface = document.createElement('div');



            width = window.innerWidth / 10;





          div.classList.add('gallery-item')
          // div.style.cssText = `width: ${width}px; height: ${width}px; left: ${(width * wide)}px; top: ${top}px`;
          div.style.cssText = `width: ${width}px; height: ${width}px;`;

          divFace.style.backgroundImage = `url(${that.imgs[i]})`;
          divFace.classList.add('gallery-item__face');

          divBackface.classList.add('gallery-item__back-face');
          divBackface.style.backgroundImage = `url(${that.imgs[17 + i]})`;


          // console.log(divFace)

          resArray.push(div);

          div.appendChild(divFace);
          div.appendChild(divBackface);
          wrap.appendChild(div);


        }
        var flipItem = 0,
          flipArr = [];
        setInterval(function () {
          flipItem = that.randomize(0, 17);


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

      var a = getSubStr('|text to get| Other text.... migh have "|"s ...', '|')
    }
  }
</script>

<style lang="scss">

  .gallery {
    padding-top: 300px;
    padding-bottom: 300px;
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
