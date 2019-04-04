<template>
  <div class="gallery-wrapper js-wrapper"></div>
</template>

<script>
  export default {
    data(){
      return {

      }
    },
    mounted(){
      var left = [0,10,20,30,40,50,60,70,80,90],
        top = [0,33.333,66.666],
        imgs = [
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
        divCount = 40,
        currentImg = 0,
        partsOfBigItem = 0.45,
        zi = 0,
        wrap = document.querySelector('.js-wrapper');



      for (var i = 0; i < divCount-1; i++){
        appendNewImg();
      }


      function initGallery() {
        var min = 1,
          max = 3,
          rand = Math.floor(Math.random() * (max - min + 1) + min);
        document.querySelector('.js-item:not(.item-disabled)').classList.add('item-disabled')
        appendNewImg();

        if (currentImg % 10 == 0){
          console.log(wrap.querySelectorAll('.item-disabled'));
          wrap.querySelectorAll('.item-disabled').forEach(el => el.remove());
        }

        setTimeout(initGallery, rand * 1000);
      }

      function appendNewImg(){
        currentImg = currentImg > imgs.length ? 0 : currentImg + 1;

        var item = document.createElement('div'),
          currentSize = Math.random() > partsOfBigItem ? 'item-small' : 'item-large',
          sizeOffset = currentSize === 'item' ? 0 : 1,
          offsetLeft = left[Math.floor(Math.random()*(left.length - sizeOffset))],
          offsetTop = top[Math.floor(Math.random()*(top.length - sizeOffset))],
          randomImg = imgs[currentImg];

        item.classList.add("js-item", "item", currentSize);
        item.style.left = offsetLeft + '%';
        item.style.top = offsetTop + '%';
        item.style.zIndex = zi++;
        item.style.backgroundImage = 'url("'+randomImg+'")';

        wrap.appendChild(item);

        setTimeout(function(){
          item.classList.add('item-active')
        },10)

      }


      initGallery()


    }
  }
</script>

<style>
  .gallery-wrapper {
    width: 100%;
    height: 30vw;
    box-sizing: border-box;
    position: relative;
  }

  .item {
    position: absolute;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: opacity 800ms ease;
    opacity: 0;
  }

  .item-small {
    width: 10%;
    height: 33.33%;
  }

  .item-large {
    width: 20%;
    height: 66.66%;
  }

  .item-active {
    opacity: 1;
  }

  .item-disabled {
    opacity: 0;
  }
</style>
