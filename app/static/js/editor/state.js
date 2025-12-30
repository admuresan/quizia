// Shared state for the editor
export const editorState = {
    currentQuiz: {
        name: '',
        pages: [],
        background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        background_image: null
    },
    currentPageIndex: 0,
    selectedElement: null,
    currentView: 'display' // 'display', 'participant', or 'control'
};

export function getCurrentQuiz() {
    return editorState.currentQuiz;
}

export function setCurrentQuiz(quiz) {
    editorState.currentQuiz = quiz;
}

export function getCurrentPageIndex() {
    return editorState.currentPageIndex;
}

export function setCurrentPageIndex(index) {
    editorState.currentPageIndex = index;
}

export function getSelectedElement() {
    return editorState.selectedElement;
}

export function setSelectedElement(element) {
    editorState.selectedElement = element;
}

export function getCurrentView() {
    return editorState.currentView;
}

export function setCurrentView(view) {
    editorState.currentView = view;
}



