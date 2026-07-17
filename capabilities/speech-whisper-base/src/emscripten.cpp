// Two of Us structured browser binding for whisper.cpp.
//
// This file is an independent binding built against whisper.cpp v1.8.6. It
// follows the public whisper.cpp API and the official whisper.wasm example's
// typed-array copy technique. The upstream engine and example are MIT licensed;
// see ../licenses/whisper.cpp-MIT.txt and ../README.md.

#include "whisper.h"

#include <emscripten/bind.h>
#include <emscripten/emscripten.h>

#include <algorithm>
#include <cstdint>
#include <string>
#include <thread>
#include <vector>

namespace {

constexpr int kMaxSamples = 12 * WHISPER_SAMPLE_RATE;
constexpr int kMaxThreads = 8;

whisper_context * g_context = nullptr;

emscripten::val result(bool ok, const char * code, const std::string & message) {
    auto value = emscripten::val::object();
    value.set("ok", ok);
    value.set("code", code);
    value.set("message", message);
    return value;
}

std::vector<float> copy_audio(const emscripten::val & audio) {
    const int length = audio["length"].as<int>();
    std::vector<float> samples(length);
    auto heap = emscripten::val::module_property("HEAPU8");
    auto memory = heap["buffer"];
    auto view = audio["constructor"].new_(
        memory,
        reinterpret_cast<std::uintptr_t>(samples.data()),
        length
    );
    view.call<void>("set", audio);
    return samples;
}

int available_threads(int requested) {
    const unsigned hardware = std::max(1u, std::thread::hardware_concurrency());
    return std::clamp(requested, 1, std::min(kMaxThreads, static_cast<int>(hardware)));
}

emscripten::val init(const std::string & model_path) {
    if (model_path.empty()) return result(false, "MODEL_PATH_REQUIRED", "缺少模型路径。");
    if (g_context != nullptr) return result(true, "ALREADY_READY", "模型已经加载。");

    auto params = whisper_context_default_params();
    g_context = whisper_init_from_file_with_params(model_path.c_str(), params);
    if (g_context == nullptr) return result(false, "MODEL_LOAD_FAILED", "无法加载本地模型。");

    auto value = result(true, "READY", "模型已在本机加载。");
    value.set("multilingual", whisper_is_multilingual(g_context) != 0);
    return value;
}

emscripten::val transcribe(
    const emscripten::val & audio,
    const std::string & language,
    int requested_threads
) {
    if (g_context == nullptr) return result(false, "NOT_READY", "模型尚未加载。");

    const int length = audio["length"].as<int>();
    if (length <= 0) return result(false, "AUDIO_EMPTY", "没有可识别的音频。");
    if (length > kMaxSamples) return result(false, "AUDIO_TOO_LONG", "音频超过 12 秒上限。");

    const std::string effective_language = language.empty() ? "zh" : language;
    if (whisper_lang_id(effective_language.c_str()) < 0) {
        return result(false, "LANGUAGE_UNSUPPORTED", "不支持所选语言。");
    }

    auto samples = copy_audio(audio);
    auto params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    params.n_threads = available_threads(requested_threads);
    params.language = effective_language.c_str();
    params.translate = false;
    params.no_context = true;
    params.no_timestamps = false;
    params.single_segment = false;
    params.print_special = false;
    params.print_progress = false;
    params.print_realtime = false;
    params.print_timestamps = false;

    whisper_reset_timings(g_context);
    const double started_at = emscripten_get_now();
    const int status = whisper_full(g_context, params, samples.data(), samples.size());
    const double inference_ms = emscripten_get_now() - started_at;
    if (status != 0) return result(false, "TRANSCRIBE_FAILED", "本机转写失败，请重试。");

    auto segments = emscripten::val::array();
    std::string text;
    const int count = whisper_full_n_segments(g_context);
    for (int index = 0; index < count; ++index) {
        const char * segment_text = whisper_full_get_segment_text(g_context, index);
        const std::string safe_text = segment_text == nullptr ? "" : segment_text;
        text += safe_text;

        auto segment = emscripten::val::object();
        segment.set("startMs", static_cast<double>(whisper_full_get_segment_t0(g_context, index) * 10));
        segment.set("endMs", static_cast<double>(whisper_full_get_segment_t1(g_context, index) * 10));
        segment.set("text", safe_text);
        segments.call<void>("push", segment);
    }

    auto value = result(true, "OK", "转写完成。");
    value.set("text", text);
    value.set("segments", segments);
    value.set("audioDurationMs", static_cast<double>(length) * 1000.0 / WHISPER_SAMPLE_RATE);
    value.set("inferenceMs", inference_ms);
    value.set("threads", params.n_threads);
    return value;
}

void dispose() {
    if (g_context == nullptr) return;
    whisper_free(g_context);
    g_context = nullptr;
}

} // namespace

EMSCRIPTEN_BINDINGS(two_of_us_speech_whisper) {
    emscripten::function("init", &init);
    emscripten::function("transcribe", &transcribe);
    emscripten::function("dispose", &dispose);
}
