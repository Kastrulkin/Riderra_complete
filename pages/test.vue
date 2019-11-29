<template>
  <div class="wrap">
    <div class="el"></div>
  </div>
</template>

<style scoped lang="scss">
.wrap{

}

</style>

<script>
  export default {
    mounted(){
      var Paysera = require('paysera-nodejs');

      var options = {
        projectid: '145503',
        sign_password: '1e7873014da814b193f918ee74622031',
        accepturl: 'http://myaccept.url',
        cancelurl: 'http://mycancel.url',
        callbackurl: 'http://mycallback.url',
        test: 1,
      };
      var paysera = new Paysera(options);


      var params = {
        orderid: 1223,
        p_email: 'customer@email.com',
        amount: 0,
        currency: 'EUR',
        payment: 'card',
      };
      var urlToGo = paysera.buildRequestUrl(params);

      console.log(urlToGo);



    }
  }
</script>
<style>
  .wrap{
    height: 200px;
    width: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .el{
    margin-top: 50%;
    margin-top: 50%;


    width: 60px;
    height: 60px;
    background: red;
  }
</style>
