<script setup lang="ts">
// #ifdef MP-WEIXIN
import LoginGuideWechat from './LoginGuideWechat.vue'
// #endif
// #ifdef H5
import LoginGuideEmail from './LoginGuideEmail.vue'
// #endif
</script>

<template>
  <!-- #ifdef MP-WEIXIN -->
  <LoginGuideWechat v-bind="$attrs" @login-success="$emit('loginSuccess')" />
  <!-- #endif -->
  <!-- #ifdef H5 -->
  <LoginGuideEmail v-bind="$attrs" @login-success="$emit('loginSuccess')" />
  <!-- #endif -->
</template>
