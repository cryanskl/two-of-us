cmake_minimum_required(VERSION 3.16)
project(two_of_us_speech_whisper LANGUAGES C CXX)

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "This binding must be configured through emcmake.")
endif()

if(NOT DEFINED WHISPER_CPP_SOURCE)
    message(FATAL_ERROR "Set WHISPER_CPP_SOURCE to the fixed whisper.cpp v1.8.6 checkout.")
endif()

set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)

add_subdirectory("${WHISPER_CPP_SOURCE}" whisper-cpp EXCLUDE_FROM_ALL)

add_executable(speech-whisper emscripten.cpp)
target_compile_features(speech-whisper PRIVATE cxx_std_17)
target_compile_options(speech-whisper PRIVATE -pthread)
target_link_libraries(speech-whisper PRIVATE whisper)
target_link_options(speech-whisper PRIVATE
    --bind
    -pthread
    -sUSE_PTHREADS=1
    -sPTHREAD_POOL_SIZE_STRICT=0
    -sINITIAL_MEMORY=512MB
    -sMAXIMUM_MEMORY=2000MB
    -sALLOW_MEMORY_GROWTH=1
    -sFORCE_FILESYSTEM=1
    -sMODULARIZE=1
    -sEXPORT_NAME=createSpeechWhisperModule
    -sENVIRONMENT=worker
    "-sEXPORTED_RUNTIME_METHODS=['FS']"
)

set_target_properties(speech-whisper PROPERTIES
    OUTPUT_NAME "speech-whisper"
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/browser"
)
