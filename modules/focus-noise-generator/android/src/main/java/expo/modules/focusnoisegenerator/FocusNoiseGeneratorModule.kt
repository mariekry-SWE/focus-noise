package expo.modules.focusnoisegenerator

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.PI
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.random.Random

private enum class NoiseType {
  WHITE,
  PINK,
  BROWN;

  companion object {
    fun fromJs(value: String): NoiseType? {
      return entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
    }
  }
}

private class NoiseGeneratorEngine {
  private val sampleRate = 44_100
  private val channelConfig = AudioFormat.CHANNEL_OUT_STEREO
  private val encoding = AudioFormat.ENCODING_PCM_16BIT
  private val minBufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, encoding).coerceAtLeast(4096)

  @Volatile private var currentType = NoiseType.WHITE
  @Volatile private var running = false
  @Volatile private var volume = 0.22f
  @Volatile private var dingSamplesRemaining = 0

  private var audioTrack: AudioTrack? = null
  private var workerThread: Thread? = null
  private var brownState = 0f
  private var pinkA = 0f
  private var pinkB = 0f
  private var pinkC = 0f
  private var dingPhase = 0.0

  fun play(type: NoiseType) {
    currentType = type
    ensureTrack()
    if (running) {
      return
    }

    running = true
    audioTrack?.play()
    workerThread = Thread {
      writeLoop()
    }.also { it.start() }
  }

  fun stop() {
    running = false
    dingSamplesRemaining = 0
    workerThread?.join(250)
    workerThread = null
    audioTrack?.pause()
    audioTrack?.flush()
  }

  fun setVolume(value: Double) {
    volume = value.toFloat().coerceIn(0f, 1f)
  }

  fun playNotice() {
    dingSamplesRemaining = (sampleRate * 0.18).toInt()
    dingPhase = 0.0
  }

  private fun ensureTrack() {
    if (audioTrack != null) {
      return
    }

    audioTrack = AudioTrack(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
        .build(),
      AudioFormat.Builder()
        .setEncoding(encoding)
        .setSampleRate(sampleRate)
        .setChannelMask(channelConfig)
        .build(),
      minBufferSize,
      AudioTrack.MODE_STREAM,
      AudioManager.AUDIO_SESSION_ID_GENERATE
    ).apply {
      setVolume(1f)
    }
  }

  private fun writeLoop() {
    val frameBuffer = ShortArray(minBufferSize / 2)

    while (running) {
      var index = 0
      while (index < frameBuffer.size) {
        val mixed = (nextNoiseSample() * volume + nextDingSample()).coerceIn(-1f, 1f)
        val pcm = (mixed * Short.MAX_VALUE).toInt().toShort()
        frameBuffer[index++] = pcm
        frameBuffer[index++] = pcm
      }

      audioTrack?.write(frameBuffer, 0, frameBuffer.size)
    }
  }

  private fun nextWhite(): Float {
    return Random.nextFloat() * 2f - 1f
  }

  private fun nextNoiseSample(): Float {
    return when (currentType) {
      NoiseType.WHITE -> nextWhite()
      NoiseType.PINK -> {
        val white = nextWhite()
        pinkA = 0.99765f * pinkA + white * 0.0990460f
        pinkB = 0.96300f * pinkB + white * 0.2965164f
        pinkC = 0.57000f * pinkC + white * 1.0526913f
        (pinkA + pinkB + pinkC + white * 0.1848f) * 0.05f
      }
      NoiseType.BROWN -> {
        val white = nextWhite() * 0.02f
        brownState = max(-1f, min(1f, brownState + white))
        brownState * 3.5f
      }
    }
  }

  private fun nextDingSample(): Float {
    if (dingSamplesRemaining <= 0) {
      return 0f
    }

    val totalSamples = sampleRate * 0.18
    val progress = dingSamplesRemaining / totalSamples
    val envelope = progress.toFloat() * progress.toFloat()
    val sample = sin(dingPhase).toFloat() * envelope * 0.18f
    dingPhase += 2.0 * PI * 880.0 / sampleRate.toDouble()
    dingSamplesRemaining -= 1
    return sample
  }
}

class FocusNoiseGeneratorModule : Module() {
  private val engine = NoiseGeneratorEngine()

  override fun definition() = ModuleDefinition {
    Name("FocusNoiseGenerator")

    AsyncFunction("playNoise") { type: String ->
      val noiseType = NoiseType.fromJs(type)
        ?: throw Exceptions.InvalidArgument("Unsupported noise type: $type")
      engine.play(noiseType)
    }

    AsyncFunction("stopNoise") {
      engine.stop()
    }

    AsyncFunction("setVolume") { value: Double ->
      engine.setVolume(value)
    }

    AsyncFunction("playNotice") {
      engine.playNotice()
    }

    OnDestroy {
      engine.stop()
    }
  }
}
