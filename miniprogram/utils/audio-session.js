/**
 * 音频会话（iOS 的 AVAudioSession / Android 的 AudioFocus）
 * ------------------------------------------------------------------
 * 现象：iPhone 侧边静音开关拨到静音后，小程序朗读只剩进度条在动、听不到声；
 *       而 QQ 音乐、网易云在同样状态下照常出声。
 *
 * 原因：这不是音乐 app 有什么特权，而是各家自己选了不同的会话类别。
 *   微信默认给 InnerAudioContext 的会话是「遵循系统静音开关」那一档 ——
 *   这符合语音消息、扫码提示音的场景（静音时就该闭嘴）；
 *   音乐类 app 用的是 AVAudioSessionCategoryPlayback，系统层面就不受静音开关约束。
 *
 * 小程序侧对应的开关就是 wx.setInnerAudioOption：
 *   obeyMuteSwitch: false  不遵循静音开关（仅 iOS 生效，基础库 2.3.0+）
 *   mixWithOther:   false  不与其它 app 混音
 *
 * 为什么 mixWithOther 也必须一起关：
 *   iOS 上它默认为 true，此时微信的会话类别仍停在「可混音」那一档，
 *   部分系统版本下 obeyMuteSwitch 会被整体忽略、静音开关照样生效。
 *   两个一起设才稳定。
 *   副作用：点播放会打断正在放的音乐 —— 对朗读这种内容消费是合理的，
 *   被背景音乐叠着念反而像 bug。
 *
 * 调用时机：**必须在创建 InnerAudioContext 之前**设置才可靠。
 * 所以 app.js 的 onLaunch 设一次，utils/audio.js 建播放器时再兜一次
 * （不依赖 App 生命周期，便于单独测试 / 未来改成 Page 级播放器）。
 */

let applied = false;
let lastOk = null;
let lastAt = 0;

/** 强制重设的节流窗口：避免 onLaunch 与紧随其后的 onShow 连发两次同样的调用 */
const MIN_GAP = 800;

/**
 * @param {boolean} force 强制重设（切回前台、怀疑会话被系统重置时用）
 * @returns {boolean} 是否已经发出设置请求（false = 基础库太老，压根没这个接口）
 */
function setup(force) {
  const now = Date.now();
  if (applied && (!force || now - lastAt < MIN_GAP)) return lastOk !== false;
  lastAt = now;
  applied = true;

  // 基础库 < 2.3.0：没有这个开关，只能继续遵循静音开关
  if (typeof wx === 'undefined' || typeof wx.setInnerAudioOption !== 'function') {
    lastOk = false;
    console.warn('[诗韵] 基础库不支持 setInnerAudioOption，朗读将遵循系统静音开关');
    return false;
  }

  try {
    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: false,
      success: function () { lastOk = true; },
      fail: function (err) {
        lastOk = false;
        console.warn('[诗韵] 音频会话设置失败，朗读将遵循系统静音开关', err);
      }
    });
  } catch (e) {
    // 开发者工具早期版本没有这个方法体，或参数不被识别时会同步抛
    lastOk = false;
    console.warn('[诗韵] 音频会话设置异常', e);
  }
  return true;
}

/** 测试用：读上一次结果（true / false / null 未返回） */
function getLastResult() { return lastOk; }

/** 测试用：重置内部状态 */
function _reset() { applied = false; lastOk = null; lastAt = 0; }

module.exports = { setup: setup, getLastResult: getLastResult, _reset: _reset };
