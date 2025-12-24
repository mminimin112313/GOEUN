<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        HelpCircle,
        BookOpen,
        Settings,
        History,
        Heart,
        Zap,
        ChevronRight,
        Sparkles,
    } from "lucide-svelte";
</script>

<div class="min-h-screen p-6 pb-32 space-y-8">
    <!-- Header -->
    <header class="text-center space-y-2">
        <h1 class="text-3xl font-black text-gradient">도움말</h1>
        <p class="text-sm text-[#8B6B8B]">앱 사용법을 알아보세요 ✨</p>
    </header>

    <!-- Quick Guide -->
    <section class="space-y-4">
        <h2 class="font-bold text-[#5C4B6B] flex items-center gap-2">
            <Sparkles size={20} class="text-[#E6B3FF]" />
            빠른 가이드
        </h2>

        <div class="space-y-3">
            <div class="card-cute space-y-3">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-full bg-[#FFB6C1] flex items-center justify-center text-white font-bold"
                    >
                        1
                    </div>
                    <div>
                        <div class="font-bold text-[#5C4B6B]">시험 설정</div>
                        <div class="text-sm text-[#8B6B8B]">
                            카테고리, 회차, 문제 수를 선택하세요
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-cute space-y-3">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-full bg-[#E6B3FF] flex items-center justify-center text-white font-bold"
                    >
                        2
                    </div>
                    <div>
                        <div class="font-bold text-[#5C4B6B]">문제 풀기</div>
                        <div class="text-sm text-[#8B6B8B]">
                            선지를 선택하고 다음 문제로 이동하세요
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-cute space-y-3">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-full bg-[#87CEEB] flex items-center justify-center text-white font-bold"
                    >
                        3
                    </div>
                    <div>
                        <div class="font-bold text-[#5C4B6B]">결과 확인</div>
                        <div class="text-sm text-[#8B6B8B]">
                            정답률과 문제별 해설을 확인하세요
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-cute space-y-3">
                <div class="flex items-center gap-3">
                    <div
                        class="w-10 h-10 rounded-full bg-[#98D8AA] flex items-center justify-center text-white font-bold"
                    >
                        4
                    </div>
                    <div>
                        <div class="font-bold text-[#5C4B6B]">오답 복습</div>
                        <div class="text-sm text-[#8B6B8B]">
                            틀린 문제를 복습하고 마스터하세요
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Categories -->
    <section class="space-y-4">
        <h2 class="font-bold text-[#5C4B6B] flex items-center gap-2">
            <BookOpen size={20} class="text-[#FFB6C1]" />
            수록 과목
        </h2>

        <div class="card-cute space-y-4">
            <div>
                <div class="chip mb-2">공법</div>
                <p class="text-sm text-[#8B6B8B]">헌법, 행정법</p>
            </div>
            <div>
                <div class="chip-purple mb-2">민사법</div>
                <p class="text-sm text-[#8B6B8B]">민법, 민사소송법, 상법</p>
            </div>
            <div>
                <div class="chip-blue mb-2">형사법</div>
                <p class="text-sm text-[#8B6B8B]">형법, 형사소송법</p>
            </div>
        </div>
    </section>

    <!-- Tips -->
    <section class="space-y-4">
        <h2 class="font-bold text-[#5C4B6B] flex items-center gap-2">
            <Zap size={20} class="text-[#FFD700]" />
            학습 팁
        </h2>

        <div class="card-cute space-y-3">
            <p class="text-sm text-[#5C4B6B]">
                💡 <strong>안 푼 문제 우선</strong> 옵션을 켜면 새로운 문제를 먼저
                풀 수 있어요
            </p>
            <p class="text-sm text-[#5C4B6B]">
                💡 <strong>선지 순서 섞기</strong>를 켜면 매번 다른 순서로
                선지가 나와요
            </p>
            <p class="text-sm text-[#5C4B6B]">
                💡 <strong>오답 노트</strong>에서 틀린 문제를 반복 학습하세요
            </p>
            <p class="text-sm text-[#5C4B6B]">
                💡 3회 연속 정답 시 자동으로 <strong>마스터</strong> 처리됩니다
            </p>
        </div>
    </section>

    <!-- Version Info -->
    <div class="text-center text-xs text-[#8B6B8B] pt-8">
        <p>고은 QUIZ v1.0.0</p>
        <p class="mt-1">변호사시험 대비 학습 앱</p>
    </div>
</div>
