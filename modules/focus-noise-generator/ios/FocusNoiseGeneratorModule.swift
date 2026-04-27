import AVFoundation
import ExpoModulesCore

private enum NoiseType: String {
  case white
  case pink
  case brown
}

private final class NoiseEngine {
  private let engine = AVAudioEngine()
  private var sourceNode: AVAudioSourceNode?
  private let sampleRate: Double = 44_100
  private let channelCount: AVAudioChannelCount = 2

  private var currentType: NoiseType = .white
  private var volume: Float = 0.22
  private var brownState: Float = 0
  private var pinkA: Float = 0
  private var pinkB: Float = 0
  private var pinkC: Float = 0
  private var dingFramesRemaining: Int = 0
  private var dingPhase: Float = 0

  init() {
    configureAudioSession()
    setupEngineIfNeeded()
  }

  func play(type: NoiseType) throws {
    currentType = type
    configureAudioSession()
    setupEngineIfNeeded()

    if !engine.isRunning {
      try engine.start()
    }
  }

  func stop() {
    dingFramesRemaining = 0
    if engine.isRunning {
      engine.pause()
    }
  }

  func setVolume(_ value: Float) {
    volume = max(0, min(value, 1))
  }

  func playNotice() {
    dingFramesRemaining = Int(sampleRate * 0.18)
    dingPhase = 0
  }

  private func configureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
    } catch {
      // The module should remain usable even if the session setup is delayed.
    }
  }

  private func setupEngineIfNeeded() {
    guard sourceNode == nil else { return }

    let format = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: sampleRate,
      channels: channelCount,
      interleaved: false
    )!

    let node = AVAudioSourceNode { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
      guard let self else { return noErr }

      let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
      for frame in 0 ..< Int(frameCount) {
        let noiseSample = self.nextNoiseSample() * self.volume
        let dingSample = self.nextDingSample()
        let mixedSample = max(-1, min(1, noiseSample + dingSample))

        for buffer in ablPointer {
          let pointer = buffer.mData?.assumingMemoryBound(to: Float.self)
          pointer?[frame] = mixedSample
        }
      }

      return noErr
    }

    sourceNode = node
    engine.attach(node)
    engine.connect(node, to: engine.mainMixerNode, format: format)
    engine.prepare()
  }

  private func nextWhite() -> Float {
    Float.random(in: -1 ... 1)
  }

  private func nextNoiseSample() -> Float {
    switch currentType {
    case .white:
      return nextWhite()
    case .pink:
      let white = nextWhite()
      pinkA = 0.99765 * pinkA + white * 0.0990460
      pinkB = 0.96300 * pinkB + white * 0.2965164
      pinkC = 0.57000 * pinkC + white * 1.0526913
      return (pinkA + pinkB + pinkC + white * 0.1848) * 0.05
    case .brown:
      let white = nextWhite() * 0.02
      brownState = max(-1, min(1, brownState + white))
      return brownState * 3.5
    }
  }

  private func nextDingSample() -> Float {
    guard dingFramesRemaining > 0 else { return 0 }

    let progress = Float(dingFramesRemaining) / Float(sampleRate * 0.18)
    let envelope = progress * progress
    let sample = sin(dingPhase) * envelope * 0.18
    dingPhase += Float((2 * Double.pi * 880) / sampleRate)
    dingFramesRemaining -= 1
    return sample
  }
}

public class FocusNoiseGeneratorModule: Module {
  private let noiseEngine = NoiseEngine()

  public func definition() -> ModuleDefinition {
    Name("FocusNoiseGenerator")

    AsyncFunction("playNoise") { (type: String) throws in
      guard let noiseType = NoiseType(rawValue: type) else {
        throw Exception(name: "invalid_type", description: "Unsupported noise type: \(type)")
      }

      try self.noiseEngine.play(type: noiseType)
    }

    AsyncFunction("stopNoise") {
      self.noiseEngine.stop()
    }

    AsyncFunction("setVolume") { (value: Double) in
      self.noiseEngine.setVolume(Float(value))
    }

    AsyncFunction("playNotice") {
      self.noiseEngine.playNotice()
    }
  }
}
