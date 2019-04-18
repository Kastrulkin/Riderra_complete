<template>
  <div class="card-payment requisites">
    <div class="card">
      <form action="" class="card-form">
        <div class="card-form__field">
          <masked-input mask="1111 1111 1111 1111" class="card-form__input" type="text" name="number"
                        placeholder="Номер карты"/>
        </div>
        <div class="card-form__field field-date">
          <input class="card-form__input field-date__input" type="text" name="month" placeholder="ММ">
          <span class="field-date__separator"></span>
          <input class="card-form__input field-date__input" type="text" name="year" placeholder="ГГ">
        </div>
        <div class="card-form__field">
          <input class="card-form__input" type="text" name="name" placeholder="Имя как на карте латиницей">
        </div>
        <label class="card-form__field field-cvc">
          <masked-input mask="111" class="card-form__input field-cvc__input" type="text" name="cvc"
                        placeholder="CVC"/>
          <span class="field-cvc__label">Проверочный код<br>с&nbsp;оборотной стороны карты</span>

        </label>

      </form>
      <div class="backface">
        <div class="backface__izoline"></div>
        <div class="backface__banks"></div>
      </div>
    </div>
    <!--<div class="form__item policy">
      <label class="policy__label">
        <input type="checkbox" checked="checked" class="policy__checkbox"> <span>Сохранить данные карты для упрощения дальнейших покупок.</span>
      </label>
    </div>
    <div class="form__item policy">
      <label class="policy__label">
        <input type="checkbox" checked="checked" class="policy__checkbox"> <span>Подтверждаю <a
        href="#" class="policy__link">условия перевозки</a></span>
      </label>
    </div>
    <input type="submit" value="Забронировать" class="payment__submit button">-->
  </div>
</template>

<script>
  import MaskedInput from 'vue-masked-input'

  export default {
    components: {MaskedInput}
  }
</script>
