/**
 * Test script to verify category filtering works correctly
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Function to test if first category is active and videos are filtered
    function testCategoryFiltering() {
        console.log('🧪 Testing category filtering functionality...');
        
        // Check if modal is initialized
        if (typeof zindeKalModal === 'undefined') {
            console.error('❌ ZindeKalModal is not initialized');
            return false;
        }
        
        // Open the modal
        zindeKalModal.open();
        
        // Wait a bit for the modal to open and DOM to update
        setTimeout(() => {
            const modalElement = document.getElementById('zindeKalModalOverlay');
            
            if (!modalElement) {
                console.error('❌ Modal element not found');
                return false;
            }
            
            // Check if we're on exercise tab
            const exerciseTab = modalElement.querySelector('#exercise-tab');
            const isExerciseTabActive = exerciseTab && exerciseTab.classList.contains('active');
            
            console.log(`📋 Current tab active: ${isExerciseTabActive ? 'exercise' : 'other'}`);
            
            if (isExerciseTabActive) {
                // Check if first category is active
                const firstCategory = modalElement.querySelector('.category-item:first-child');
                const isFirstCategoryActive = firstCategory && firstCategory.classList.contains('active');
                
                console.log(`🎯 First category active: ${isFirstCategoryActive ? '✅ YES' : '❌ NO'}`);
                
                // Check video grid content
                const videoGrid = modalElement.querySelector('#exercise-tab .video-grid');
                const videoCards = videoGrid ? videoGrid.querySelectorAll('.video-card') : [];
                
                console.log(`📹 Videos displayed: ${videoCards.length}`);
                
                // Check if videos belong to first category
                if (firstCategory && videoCards.length > 0) {
                    const firstCategoryId = firstCategory.dataset.category;
                    console.log(`🏷️ First category ID: ${firstCategoryId}`);
                    
                    // Check configuration to see expected videos for this category
                    const expectedVideos = zindeKalModal.config.exercise.videos.filter(
                        video => video.categoryId === firstCategoryId
                    );
                    
                    console.log(`📊 Expected videos for category "${firstCategoryId}": ${expectedVideos.length}`);
                    console.log(`📊 Actual videos displayed: ${videoCards.length}`);
                    
                    const isCorrectFiltering = expectedVideos.length === videoCards.length;
                    console.log(`🔍 Filtering correct: ${isCorrectFiltering ? '✅ YES' : '❌ NO'}`);
                    
                    return isFirstCategoryActive && isCorrectFiltering;
                }
            }
            
            // Close modal after test
            zindeKalModal.close();
            
            return false;
        }, 500);
    }
    
    // Function to test tab switching
    function testTabSwitching() {
        console.log('🔄 Testing tab switching...');
        
        if (typeof zindeKalModal === 'undefined') {
            console.error('❌ ZindeKalModal is not initialized');
            return;
        }
        
        // Open modal and switch to relaxing tab first
        zindeKalModal.open();
        zindeKalModal.switchTab('relaxing');
        
        setTimeout(() => {
            console.log('📋 Switched to relaxing tab');
            
            // Now switch back to exercise tab
            zindeKalModal.switchTab('exercise');
            
            setTimeout(() => {
                console.log('📋 Switched back to exercise tab');
                
                const modalElement = document.getElementById('zindeKalModalOverlay');
                const firstCategory = modalElement.querySelector('.category-item:first-child');
                const isFirstCategoryActive = firstCategory && firstCategory.classList.contains('active');
                
                console.log(`🎯 First category active after tab switch: ${isFirstCategoryActive ? '✅ YES' : '❌ NO'}`);
                
                // Close modal
                zindeKalModal.close();
            }, 300);
        }, 300);
    }
    
    // Add test buttons to the page
    const buttonContainer = document.querySelector('.button-container');
    
    if (buttonContainer) {
        const testButton1 = document.createElement('button');
        testButton1.textContent = 'Test Category Filtering';
        testButton1.className = 'zinde-kal-button';
        testButton1.onclick = testCategoryFiltering;
        
        const testButton2 = document.createElement('button');
        testButton2.textContent = 'Test Tab Switching';
        testButton2.className = 'zinde-kal-button';
        testButton2.onclick = testTabSwitching;
        
        buttonContainer.appendChild(testButton1);
        buttonContainer.appendChild(testButton2);
        
        console.log('🛠️ Test buttons added to the page');
    }
});