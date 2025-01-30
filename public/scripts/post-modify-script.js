import { BASE_URL } from '../global.js';

const checkAuth = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/auths/check-session`, {
            method: 'GET',
            credentials: 'include', // ✅ 세션 쿠키 포함 필수
        });

        if (response.status === 401) {
            console.warn(
                'Unauthorized access detected. Redirecting to login page...',
            );
            window.location.href = '/users/login'; // ✅ 로그인 페이지로 강제 이동
        }
    } catch (error) {
        console.error('Error checking auth:', error);
    }
};

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', checkAuth);

document.addEventListener('DOMContentLoaded', async () => {
    // 현재 URL에서 post_id 추출
    const getPostIdFromUrl = () =>
        window.location.pathname.split('/').slice(-2, -1)[0];

    // 뒤로가기 버튼 클릭 시 게시글 목록 페이지 이동
    const backButton = document.querySelector('.back-btn');
    backButton.addEventListener('click', () => {
        event.preventDefault(); // 기본 동작(새로고침) 방지
        window.location.href = '/posts';
    });

    // 로그인 시 세션에서 유저 데이터 가져오는 함수
    const getUserInfo = async () => {
        try {
            const response = await fetch(`${BASE_URL}/api/auths/profile`, {
                method: 'GET',
                credentials: 'include', // 세션 쿠키 포함
            });

            return response.ok ? await response.json() : null; // 사용자 정보 반환 또는 null
        } catch (error) {
            console.error('사용자 정보 가져오기 실패:', error);
            return null;
        }
    };

    // 로그인 상태에서 헤더 유저 정보 렌더링
    const profileImage = document.querySelector('.profile');
    const renderUserData = async () => {
        const user = await getUserInfo();
        profileImage.src = user
            ? user.profile_image_url
            : 'https://www.gravatar.com/avatar/?d=mp';
    };

    renderUserData();

    // 게시글 상세 정보 데이터 가져오기
    const fetchPostData = async (postId) => {
        try {
            const response = await fetch(`${BASE_URL}/api/posts/${postId}`);
            if (!response.ok)
                throw new Error(
                    '수정할 게시글 정보를 불러오는데 실패했습니다.',
                );
            return await response.json();
        } catch (e) {
            console.error('fetch error:', e);
        }
    };

    // 게시글 원래 내용 불러오기
    const loadPostData = async () => {
        const postTitle = document.getElementById('post-title');
        const postContent = document.getElementById('post-content');
        const fileInput = document.getElementById('post-image');
        const fileNameSpan = document.getElementById('file-name');

        const posts = await fetchPostData(getPostIdFromUrl());
        const { post_title, post_content, post_image_name } = posts.data;

        postTitle.value = post_title;
        postContent.value = post_content;
        fileNameSpan.textContent = post_image_name;

        fileInput.addEventListener('change', () => {
            fileNameSpan.textContent =
                fileInput.files[0]?.name || '파일을 선택해주세요.';
        });
    };

    loadPostData();

    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const helperText = document.querySelector('.helper-text');
    const submitButton = document.getElementById('post-modify-complete-btn');

    // 입력 값이 변경될 때 helper-text 업데이트
    const updateHelperText = () => {
        if (!titleInput.value.trim() && !contentInput.value.trim()) {
            helperText.textContent = '* 제목과 내용을 입력해주세요.';
        } else if (!titleInput.value.trim()) {
            helperText.textContent = '* 제목을 입력해주세요.';
        } else if (!contentInput.value.trim()) {
            helperText.textContent = '* 내용을 입력해주세요.';
        } else {
            helperText.textContent = '';
        }
    };

    // 입력 필드에 이벤트 리스너 추가
    titleInput.addEventListener('input', updateHelperText);
    contentInput.addEventListener('input', updateHelperText);

    // 수정하기 버튼 클릭 시 유효성 검사
    submitButton.addEventListener('click', (event) => {
        if (!titleInput.value.trim() || !contentInput.value.trim()) {
            event.preventDefault(); // 폼 제출 방지
            updateHelperText();
        }
    });

    // 수정하기 버튼 클릭 시 게시글 내용 수정
    document
        .getElementById('post-modify-complete-btn')
        .addEventListener('click', async (event) => {
            event.preventDefault(); // 폼 기본 제출 동작 방지

            const postId = getPostIdFromUrl();
            const postTitle = document
                .getElementById('post-title')
                .value.trim();
            const postContent = document
                .getElementById('post-content')
                .value.trim();
            const imageInput = document.getElementById('post-image');

            try {
                // 서버에 수정 요청 보내기
                const response = await fetch(
                    `${BASE_URL}/api/posts/${postId}`,
                    {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            post_title: postTitle,
                            post_content: postContent,
                        }), // 수정된 내용 전송
                    },
                );

                // 게시글 이미지 업로드
                if (imageInput.files.length > 0) {
                    const file = imageInput.files[0];
                    const formData = new FormData();
                    formData.append('post_image', file);
                    formData.append('post_image_name', file.name);

                    const uploadResponse = await fetch(
                        `${BASE_URL}/api/posts/${postId}/post-image`,
                        {
                            method: 'POST',
                            body: formData,
                        },
                    );

                    if (!uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        console.error(
                            `게시글 이미지 업로드 실패: ${uploadResult.message}`,
                        );
                        return;
                    }
                    console.log('게시글 이미지 업로드 성공');
                }

                if (response.ok) {
                    const result = await response.json();
                    console.log('게시글 수정 성공:', result.data);
                    alert('게시글이 성공적으로 수정되었습니다.');
                    window.location.href = `/posts/${postId}`;
                } else {
                    const result = await response.json();
                    console.error('게시글 수정 실패:', result.message);
                    alert('게시글 수정에 실패했습니다.');
                }
            } catch (error) {
                console.error('에러 발생:', error);
                alert('서버와 통신 중 문제가 발생했습니다.');
            }
        });
});
